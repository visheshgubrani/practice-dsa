import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setImmediate } from "node:timers/promises";
import { it } from "node:test";
import { runInNewContext } from "node:vm";

import { isValidElement, type ReactNode } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

import type { ReviewReminder } from "@/components/dashboard/review-reminder";
import type { ReviewQueueProvider } from "@/components/reviews/review-queue-provider";
import type { ReviewsHub } from "@/components/reviews/reviews-hub";
import type { StudyShell } from "@/components/shell/study-shell";
import type * as queueHook from "@/lib/hooks/use-review-queue";
import * as days from "@/lib/practice/days";
import * as calendar from "@/lib/progress/calendar";
import * as summary from "@/lib/progress/summary";
import * as client from "./client";
import * as date from "./date";
import * as queueView from "./queue-view";
import type { ReviewQueue, ReviewSummary } from "./types";

// Execute the actual hooks and JSX. Replace only React storage, transport,
// routing, and presentation primitives; no database or DOM is needed.
function loadSource<T>(path: string, imports: Record<string, unknown>, globals: Record<string, unknown> = {}): T {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports, Error, AbortController, URLSearchParams,
    require(name: string) {
      assert.ok(name in imports, `Unexpected test import: ${name}`);
      return imports[name];
    },
    ...globals,
  });
  return exports as T;
}

function hookStorage() {
  const slots: unknown[] = [];
  let cursor = 0;
  return {
    render<T>(callback: () => T): T { cursor = 0; return callback(); },
    react: {
      useState(initial: unknown) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
        return [slots[index], (value: unknown) => {
          slots[index] = typeof value === "function" ? value(slots[index]) : value;
        }];
      },
      useRef(initial: unknown) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = { current: initial };
        return slots[index];
      },
      useCallback<T>(callback: T) { return callback; },
      useEffect() {},
      createContext<T>(initial: T) { return { current: initial, Provider: "provider" }; },
      useContext(context: { current: unknown }) { return context.current; },
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function elements(node: ReactNode): Array<React.ReactElement<Record<string, unknown>>> {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children as ReactNode)];
}

function textOf(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (typeof node === "string" || typeof node === "number") return String(node);
  return isValidElement<{ children?: ReactNode }>(node) ? textOf(node.props.children) : "";
}

const a: ReviewSummary = {
  slug: "two-sum", number: 1, title: "Two Sum", difficulty: "easy",
  topic: "Arrays & Hashing", dueAt: "2026-10-08T10:00:00.000Z", revision: 2,
};
const b: ReviewSummary = { ...a, slug: "valid-parentheses", number: 20, title: "Valid Parentheses", topic: "Stack" };
function queue(due = [a, b], paused: ReviewSummary[] = []): ReviewQueue {
  return { dueCount: due.length, due, upcoming: [], paused, nextDueAt: null };
}
const card = (active: boolean) => ({ enrolled: true, active, dueAt: a.dueAt, lastRating: "good", revision: 3 });

const ui = {
  "react/jsx-runtime": jsxRuntime,
  "next/link": { default: "a" },
  "lucide-react": { CirclePlayIcon: "i", RefreshCwIcon: "i", SearchIcon: "i", ArrowRightIcon: "i", RepeatIcon: "i" },
  "@/components/ui/alert": { Alert: "aside", AlertTitle: "h3", AlertDescription: "p" },
  "@/components/ui/button": { Button: "button" },
  "@/components/ui/empty": { Empty: "div", EmptyContent: "div", EmptyDescription: "p", EmptyHeader: "header", EmptyTitle: "h3" },
  "@/components/ui/input": { Input: "input" },
  "@/components/ui/select": { Select: "select", SelectContent: "div", SelectItem: "option", SelectTrigger: "button", SelectValue: "span" },
  "@/components/ui/spinner": { Spinner: "span" },
  "@/components/ui/tabs": { Tabs: "div", TabsContent: "section", TabsList: "nav", TabsTrigger: "button" },
  "@/lib/utils": { cn: () => "" },
};

function hubHarness(state: () => queueHook.ReviewQueueState, fetch: typeof globalThis.fetch) {
  const storage = hookStorage();
  const hub = loadSource<{ ReviewsHub: typeof ReviewsHub }>("../../components/reviews/reviews-hub.tsx", {
    ...ui, react: storage.react,
    "next/navigation": { useSearchParams: () => new URLSearchParams() },
    "@/components/reviews/review-row": { ReviewRow: "review-row" },
    "@/lib/hooks/use-review-queue": { useReviewQueue: state },
    "@/lib/reviews/client": client,
    "@/lib/reviews/queue-view": queueView,
  }, { fetch });
  const render = () => storage.render(() => hub.ReviewsHub());
  const row = (tree: ReactNode, slug: string) => {
    const match = elements(tree).find((element) => element.type === "review-row" && (element.props.problem as ReviewSummary).slug === slug);
    assert.ok(match, `Missing row ${slug}`);
    return match.props as { updating: boolean; onSetActive: (problem: ReviewSummary, active: boolean) => void };
  };
  return { render, row };
}

function ready(refresh: queueHook.ReviewQueueState["refresh"], value: ReviewQueue | null = queue()): queueHook.ReviewQueueState {
  return { queue: value, status: value ? "ready" : "error", error: value ? null : "Queue unavailable", refreshing: false, refresh };
}

it("shares one provider's canonical queue and failed-refresh state across consumers", async () => {
  const storage = hookStorage();
  let reads = 0;
  const hook = loadSource<typeof queueHook>("../hooks/use-review-queue.ts", {
    react: storage.react, "next/navigation": { usePathname: () => "/" },
    "@/lib/reviews/boundary": {}, "@/lib/reviews/client": client,
  }, { async fetch() {
    reads++;
    return reads === 1 ? Response.json(queue([a])) : Response.json({ error: "Queue unavailable" }, { status: 503 });
  } });
  const provider = loadSource<{ ReviewQueueProvider: typeof ReviewQueueProvider }>("../../components/reviews/review-queue-provider.tsx", {
    "react/jsx-runtime": jsxRuntime, "@/lib/hooks/use-review-queue": hook,
  });
  const context = hook.ReviewQueueContext as unknown as { current: queueHook.ReviewQueueState };
  const render = () => {
    const tree = storage.render(() => provider.ReviewQueueProvider({ initialQueue: queue(), initialError: null, children: null }));
    context.current = tree.props.value;
    return context.current;
  };
  await render().refresh();
  render();
  const first = hook.useReviewQueue();
  assert.equal(first, hook.useReviewQueue());
  assert.equal(first.queue?.dueCount, 1);
  await first.refresh();
  render();
  assert.equal(reads, 2);
  assert.equal(hook.useReviewQueue().status, "ready");
  assert.equal(hook.useReviewQueue().queue?.dueCount, 1);
  assert.equal(hook.useReviewQueue().error, "Queue unavailable");

  const reminder = loadSource<{ ReviewReminder: typeof ReviewReminder }>("../../components/dashboard/review-reminder.tsx", {
    ...ui, "@/lib/hooks/use-review-queue": hook, "@/lib/reviews/date": date,
  });
  const hub = hubHarness(hook.useReviewQueue, async () => { throw new Error("Unexpected write"); });
  assert.match(textOf(reminder.ReviewReminder()), /1 review due/);
  assert.match(textOf(reminder.ReviewReminder()), /Showing the last known count/);
  assert.match(textOf(hub.render()), /1 due/);
  assert.match(textOf(hub.render()), /Queue unavailable/);

  const sidebarParts = Object.fromEntries([
    "Sidebar", "SidebarContent", "SidebarGroup", "SidebarGroupContent",
    "SidebarHeader", "SidebarMenu", "SidebarMenuBadge", "SidebarMenuButton",
    "SidebarMenuItem", "SidebarProvider", "SidebarRail",
  ].map((name) => [name, name]));
  const shell = loadSource<{ StudyShell: typeof StudyShell }>("../../components/shell/study-shell.tsx", {
    ...ui, react: storage.react,
    "lucide-react": { LayoutDashboardIcon: "i", ListTreeIcon: "i", RepeatIcon: "i" },
    "next/navigation": { usePathname: () => "/" },
    "@/components/ui/sidebar": { ...sidebarParts, useSidebar: () => ({ isMobile: false, setOpenMobile() {} }) },
    "@/components/reviews/review-queue-provider": provider,
    "@/lib/hooks/use-review-queue": hook,
  });
  const shellTree = shell.StudyShell({ defaultOpen: true, initialQueue: queue(), initialError: null, children: null });
  assert.equal(shellTree.type, provider.ReviewQueueProvider);
  const sidebar = elements(shellTree).find((element) => typeof element.type === "function");
  // The root provider comes first; find the internal sidebar in its children.
  const sidebarElement = elements(shellTree.props.children).find((element) => typeof element.type === "function");
  assert.ok(sidebar && sidebarElement);
  const renderedSidebar = (sidebarElement.type as () => ReactNode)();
  const badge = elements(renderedSidebar).find((element) => element.type === "SidebarMenuBadge");
  assert.equal(badge?.props.children, 1);
});

it("coalesces reads and waits for a fresh read when invalidated in flight", async () => {
  const storage = hookStorage();
  const first = deferred<Response>();
  const second = deferred<Response>();
  let reads = 0;
  const hook = loadSource<typeof queueHook>("../hooks/use-review-queue.ts", {
    react: storage.react, "next/navigation": { usePathname: () => "/reviews" },
    "@/lib/reviews/boundary": {}, "@/lib/reviews/client": client,
  }, { fetch() { return ++reads === 1 ? first.promise : second.promise; } });
  const render = () => storage.render(() => hook.useReviewQueueLoader(queue()));
  const pending = render().refresh();
  assert.equal(render().refresh(), pending);
  await setImmediate();
  assert.equal(reads, 1);
  assert.equal(render().refresh(true), pending);
  first.resolve(Response.json(queue([a])));
  await setImmediate();
  assert.equal(reads, 2);
  assert.equal(render().refreshing, true);
  second.resolve(Response.json(queue([], [a, b])));
  assert.equal((await pending)?.dueCount, 0);
  assert.equal(render().queue?.paused.length, 2);
  assert.equal(render().refreshing, false);
});

it("keeps the dashboard available after the initial review read fails and avoids false empty states", async () => {
  const layout = loadSource<{ default: (props: { children: ReactNode }) => Promise<React.ReactElement> }>("../../app/(study)/layout.tsx", {
    "react/jsx-runtime": jsxRuntime,
    "next/headers": { cookies: async () => ({ get: () => undefined }) },
    "@/components/shell/study-shell": { StudyShell: "study-shell" },
    "@/lib/db/queries/reviews": { listReviewQueue: async () => { throw new Error("Queue unavailable"); } },
    "@/lib/shell/sidebar-cookie": { STUDY_SIDEBAR_COOKIE: "sidebar_state" },
  });
  const shell = await layout.default({ children: "dashboard" });
  assert.equal((shell.props as Record<string, unknown>).initialQueue, null);
  assert.equal((shell.props as Record<string, unknown>).initialError, "Queue unavailable");
  // Import allowlist also ensures the page never performs a review read.
  const page = loadSource<{ default: () => Promise<React.ReactElement> }>("../../app/(study)/page.tsx", {
    "react/jsx-runtime": jsxRuntime,
    "@/components/dashboard/progress-summary": { ProgressSummaryCard: "progress" },
    "@/components/dashboard/review-reminder": { ReviewReminder: "reminder" },
    "@/components/dashboard/streak-calendar": { StreakCalendar: "calendar" },
    "@/components/dashboard/topic-progress": { TopicProgressList: "topics" },
    "@/components/database-unavailable": { DatabaseUnavailable: "unavailable" },
    "@/components/shell/page-chrome": { PageBody: "body", PageHeader: "header" },
    "@/lib/db/queries/dashboard": {
      listProgressStatuses: async () => new Map(), activityBounds: async () => ({ first: null, last: null }),
      dashboardTotals: async () => ({ submissions: 0, submits: 0, revisions: 0 }), listActivityDays: async () => [],
    },
    "@/lib/db/queries/problems": { listProblemSummaries: async () => [] },
    "@/lib/practice/days": days, "@/lib/progress/calendar": calendar, "@/lib/progress/summary": summary,
  });
  const dashboard = await page.default();
  assert.equal(dashboard.type, "main");
  assert.ok(elements(dashboard).some((element) => element.type === "calendar"));
  assert.ok(elements(dashboard).some((element) => element.type === "progress"));
  const state = ready(async () => null, null);
  const hub = hubHarness(() => state, async () => { throw new Error("Unexpected write"); });
  assert.match(textOf(hub.render()), /Queue unavailable/);
  assert.doesNotMatch(textOf(hub.render()), /Nothing due|0 due|No paused reviews/);
  const reminder = loadSource<{ ReviewReminder: typeof ReviewReminder }>("../../components/dashboard/review-reminder.tsx", {
    ...ui, "@/lib/hooks/use-review-queue": { useReviewQueue: () => state }, "@/lib/reviews/date": date,
  });
  assert.match(textOf(reminder.ReviewReminder()), /Review count unavailable/);
  assert.match(textOf(reminder.ReviewReminder()), /Retry/);
});

it("locks overlapping writes per problem, rejects duplicates before rerender, and waits through refresh", async () => {
  const writes = [deferred<Response>(), deferred<Response>()];
  const reads = [deferred<ReviewQueue>(), deferred<ReviewQueue>()];
  let writeCount = 0;
  let readCount = 0;
  const state = ready(() => reads[readCount++].promise);
  const hub = hubHarness(() => state, async () => writes[writeCount++].promise);
  const original = hub.render();
  hub.row(original, a.slug).onSetActive(a, false);
  hub.row(original, a.slug).onSetActive(a, false);
  hub.row(original, b.slug).onSetActive(b, false);
  assert.equal(writeCount, 2);
  assert.equal(hub.row(hub.render(), a.slug).updating, true);
  assert.equal(hub.row(hub.render(), b.slug).updating, true);
  const startNext = elements(hub.render()).find((element) => textOf(element.props.children as ReactNode).trim() === "Start next review");
  assert.equal(startNext?.props.disabled, true);
  writes[0].resolve(Response.json(card(false)));
  await setImmediate();
  assert.equal(hub.row(hub.render(), a.slug).updating, true);
  reads[0].resolve(queue());
  await setImmediate();
  assert.equal(hub.row(hub.render(), a.slug).updating, false);
  assert.equal(hub.row(hub.render(), b.slug).updating, true);
  writes[1].resolve(Response.json(card(false)));
  await setImmediate();
  assert.equal(hub.row(hub.render(), b.slug).updating, true);
  reads[1].resolve(queue());
  await setImmediate();
  assert.equal(hub.row(hub.render(), b.slug).updating, false);
});

for (const failure of ["lost response", "server error", "malformed response"] as const) {
  it(`reconciles a committed pause after a ${failure} without retrying the write`, async () => {
    let value = queue();
    let writes = 0;
    let reads = 0;
    const hub = hubHarness(() => ready(async () => { reads++; return value; }, value), async () => {
      writes++;
      value = queue([b], [{ ...a, revision: 3 }]);
      if (failure === "lost response") throw new Error("Response lost after commit");
      return failure === "server error"
        ? Response.json({ error: "Response failed" }, { status: 500 })
        : Response.json({});
    });
    hub.row(hub.render(), a.slug).onSetActive(a, false);
    await setImmediate();
    assert.equal(writes, 1);
    assert.equal(reads, 1);
    assert.equal(value.paused[0].slug, a.slug);
    assert.doesNotMatch(textOf(hub.render()), /not saved|could not be confirmed/);
  });
}

it("reports uncertainty if both a lost PATCH response and reconciliation fail", async () => {
  let reads = 0;
  const hub = hubHarness(() => ready(async () => { reads++; return null; }), async () => { throw new Error("Response lost"); });
  hub.row(hub.render(), a.slug).onSetActive(a, false);
  await setImmediate();
  assert.equal(reads, 1);
  assert.match(textOf(hub.render()), /Change could not be confirmed/);
  assert.match(textOf(hub.render()), /latest state could not be read/);
  assert.doesNotMatch(textOf(hub.render()), /not saved/);
});

it("does not claim a stale-write conflict was refreshed when its GET fails", async () => {
  const hub = hubHarness(() => ready(async () => null), async () => Response.json({ error: "Stale revision" }, { status: 409 }));
  hub.row(hub.render(), a.slug).onSetActive(a, false);
  await setImmediate();
  assert.match(textOf(hub.render()), /Review changed in another tab/);
  assert.match(textOf(hub.render()), /latest list could not be read/);
  assert.doesNotMatch(textOf(hub.render()), /list shows the current server state/);
});

it("distinguishes a confirmed write from a failed list refresh", async () => {
  const hub = hubHarness(() => ready(async () => null), async () => Response.json(card(false)));
  hub.row(hub.render(), a.slug).onSetActive(a, false);
  await setImmediate();
  assert.match(textOf(hub.render()), /Change saved; list not refreshed/);
  assert.doesNotMatch(textOf(hub.render()), /not saved/);
});

#!/usr/bin/env node
/**
 * Browser check for the Phase 15 chat controls.
 *
 * Drives Chrome over the DevTools Protocol (no extra dependencies): opens the
 * workspace, switches to the AI Chat tab, and checks the three primary actions,
 * the More help menu, the availability rule, and a narrow pane.
 *
 * Use OPENAI_API_KEY= and DSA_CHAT_DEMO_CHUNK_MS=100 for deterministic
 * interruption checks. The app MUST use a disposable database copy, because
 * these checks create conversations. Point it at a running app holding a saved
 * conversation, for example a production server on a disposable database copy:
 *
 *   DATABASE_URL=... PORT=3011 pnpm start
 *   node scripts/chat-controls-check.mjs http://127.0.0.1:3011/problems/two-sum
 */

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const URL_UNDER_TEST = process.argv[2] ?? "http://127.0.0.1:3010/problems/two-sum";
const CHROME = process.env.CHROME_BIN ?? "google-chrome";
const PORT = Number(process.env.CDP_PORT ?? "9222");

const failures = [];
let checks = 0;

function check(what, ok, detail = "") {
  checks += 1;
  if (ok) {
    console.log(`  ok    ${what}`);
    return;
  }
  failures.push(what);
  console.log(`  FAIL  ${what}${detail ? ` → ${detail}` : ""}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch {
      // Chrome is still starting.
    }
    await sleep(500);
  }
  throw new Error(`no CDP endpoint at ${url}`);
}

/** Minimal DevTools Protocol client on Node's built-in WebSocket. */
class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.onEvent = null;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      const waiter = this.pending.get(message.id);
      if (!waiter) {
        this.onEvent?.(message);
        return;
      }
      this.pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.resolve(message.result);
    });
  }

  static async attach(wsUrl) {
    const socket = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    return new Cdp(socket);
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text ?? "evaluate failed");
    }
    return result.result.value;
  }

  async waitFor(expression, timeoutMs = 20000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.evaluate(expression)) return true;
      await sleep(400);
    }
    return false;
  }

  /**
   * Centre of the first rendered control whose trimmed text matches exactly
   * (`text`) or by prefix (`startsWith`). Null when it is missing, hidden, or
   * outside the viewport.
   */
  rectOf({ text, startsWith }) {
    const match = startsWith
      ? `(node) => node.textContent.trim().startsWith(${JSON.stringify(startsWith)})`
      : `(node) => node.textContent.trim() === ${JSON.stringify(text)}`;
    return this.evaluate(`(() => {
      const matches = ${match};
      // The workspace keeps inactive tab panels mounted, so skip hidden copies.
      const node = [...document.querySelectorAll('button,[role="tab"]')]
        .filter(matches)
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      if (!node) return { miss: "not found" };
      const box = node.getBoundingClientRect();
      if (box.top < 0 || box.bottom > window.innerHeight) {
        return { miss: "outside viewport", top: box.top, bottom: box.bottom };
      }
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    })()`);
  }

  /** A real mouse click, so base-ui's pointer-driven triggers react to it. */
  async clickSelector(target) {
    const rect = await this.rectOf(target);
    if (!rect || rect.miss) {
      this.lastMiss = rect?.miss ?? "no rect";
      return false;
    }
    await this.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: rect.x,
      y: rect.y,
    });
    for (const [type, buttons] of [
      ["mousePressed", 1],
      ["mouseReleased", 0],
    ]) {
      await this.send("Input.dispatchMouseEvent", {
        type,
        x: rect.x,
        y: rect.y,
        button: "left",
        buttons,
        clickCount: 1,
      });
    }
    return true;
  }

  async pressKey(key, code = key, keyCode = 0) {
    for (const type of ["rawKeyDown", "keyUp"]) {
      await this.send("Input.dispatchKeyEvent", {
        type,
        key,
        code,
        windowsVirtualKeyCode: keyCode,
        nativeVirtualKeyCode: keyCode,
      });
    }
  }
}

async function main() {
  const profile = mkdtempSync(path.join(tmpdir(), "p15-chrome-"));
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      "--window-size=1440,980",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  try {
    await fetchJson(`http://127.0.0.1:${PORT}/json/version`);
    const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
    const page = targets.find((target) => target.type === "page");
    if (!page) throw new Error("no page target");
    const cdp = await Cdp.attach(page.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 980,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send("Page.navigate", { url: URL_UNDER_TEST });
    await cdp.waitFor(`document.querySelectorAll('button').length > 8`);

    console.log(`Browser check — ${URL_UNDER_TEST}`);

    // The pane can re-mount shortly after load, which drops a tab change, so
    // click until the chat panel is genuinely the visible one.
    const visibleChatButton = (label) => `[...document.querySelectorAll('button')]
      .some((node) => node.textContent.trim() === ${JSON.stringify(label)}
        && node.getBoundingClientRect().width > 0)`;
    let chatOpen = false;
    for (let attempt = 0; attempt < 6 && !chatOpen; attempt += 1) {
      await cdp.clickSelector({ startsWith: "AI Chat" });
      chatOpen = await cdp.waitFor(
        `(() => {
          const panel = [...document.querySelectorAll('[role="tabpanel"]')]
            .find((node) => node.textContent.includes("Give me a hint"));
          return Boolean(panel) && !panel.hasAttribute("hidden")
            && panel.getBoundingClientRect().width > 0;
        })()`,
        6000,
      );
    }
    check("the AI Chat tab is present", chatOpen);
    check(
      "the chat composer renders after switching tabs",
      chatOpen && (await cdp.waitFor(visibleChatButton("Give me a hint"))),
    );
    if (!chatOpen) throw new Error("Chat panel unavailable; acceptance cannot continue");

    for (const label of [
      "Give me a hint",
      "Make it concrete",
      "Show a tiny example",
      "More help",
    ]) {
      const present = await cdp.evaluate(
        `[...document.querySelectorAll('button')].some((node) => node.textContent.trim() === ${JSON.stringify(label)})`,
      );
      check(`the "${label}" control renders`, present);
    }

    const concreteState = () =>
      cdp.evaluate(`(() => {
        const button = [...document.querySelectorAll('button')]
          .find((node) => node.textContent.trim() === "Make it concrete");
        if (!button) return "missing";
        return button.disabled ? "disabled" : "enabled";
      })()`);

    const restored = await concreteState();
    check(
      "Make it concrete is available once a saved reply exists",
      restored === "enabled",
      String(restored),
    );

    const triggerPressed = await cdp.clickSelector({ startsWith: "More help" });
    const triggerExpanded = triggerPressed
      ? await cdp.evaluate(`(() => {
          const trigger = [...document.querySelectorAll('button')]
            .find((node) => node.textContent.trim().startsWith("More help"));
          return trigger ? trigger.getAttribute("aria-expanded") : "gone";
        })()`)
      : "not pressed";
    const triggerOpened =
      triggerPressed &&
      (await cdp.waitFor(
        `document.querySelectorAll('[data-slot="dropdown-menu-item"]').length === 4`,
        8000,
      ));
    check(
      "the More help menu opens",
      triggerOpened,
      `pressed=${triggerPressed} (${cdp.lastMiss ?? "hit"}) expanded=${triggerExpanded} error=${await cdp.evaluate(
        `document.body.textContent.includes("Something went wrong")`,
      )}`,
    );

    const menuItems = await cdp.evaluate(
      `[...document.querySelectorAll('[data-slot="dropdown-menu-item"]')].map((node) => node.textContent.trim())`,
    );
    check(
      "More help holds the four secondary actions",
      ["Explain it simply", "Review my code", "Why is this failing?", "Explain the complexity"].every(
        (label) => menuItems.includes(label),
      ),
      JSON.stringify(menuItems),
    );
    check(
      "the menu fits inside the window",
      await cdp.evaluate(`(() => {
        const popup = document.querySelector('[data-slot="dropdown-menu-content"]');
        if (!popup) return false;
        const box = popup.getBoundingClientRect();
        return box.width > 0 && box.left >= 0 && box.right <= window.innerWidth + 1;
      })()`),
    );

    await cdp.pressKey("Escape", "Escape", 27);
    check(
      "the menu closes on Escape",
      await cdp.waitFor(
        `document.querySelectorAll('[data-slot="dropdown-menu-content"]').length === 0`,
        5000,
      ),
    );

    // A brand-new conversation has no reply to sharpen yet.
    check(
      "the new-conversation control is pressable",
      await cdp.clickSelector({ text: "new" }),
    );
    const freshReady = await cdp.waitFor(
      `[...document.querySelectorAll('button')].some((node) => node.textContent.trim() === "Make it concrete")`,
    );
    check("the composer returns on a new conversation", freshReady);
    if (freshReady) {
      const fresh = await concreteState();
      check(
        "Make it concrete waits on a brand-new conversation",
        fresh === "disabled",
        String(fresh),
      );
    }

    const stopped = () => `[...document.querySelectorAll('button')].some((b) => b.getAttribute('aria-label') === 'Stop generating')`;
    const idle = () => `![...document.querySelectorAll('button')].some((b) => b.getAttribute('aria-label') === 'Stop generating')`;
    const allActionsDisabled = () => cdp.evaluate(`[...document.querySelectorAll('button')].filter((b) => ['Give me a hint', 'Make it concrete', 'Show a tiny example', 'More help'].includes(b.textContent.trim())).every((b) => b.disabled)`);
    check("hint sends through the normal transport", await cdp.clickSelector({ text: "Give me a hint" }));
    check("Stop appears during generation", await cdp.waitFor(stopped(), 8000));
    check("sending actions disable during generation", await allActionsDisabled());
    await sleep(650);
    const stopButton = await cdp.evaluate(`(() => {
      const b = document.querySelector('button[aria-label="Stop generating"]');
      if (!b) return null;
      const r = b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};
    })()`);
    if (!stopButton) throw new Error("Stop disappeared before interruption; use DSA_CHAT_DEMO_CHUNK_MS=100");
    for (const type of ["mousePressed", "mouseReleased"]) {
      await cdp.send("Input.dispatchMouseEvent", { type, ...stopButton, button: "left", clickCount: 1 });
    }
    check("Stop ends the stream", await cdp.waitFor(idle()));
    check("an interrupted first reply does not unlock Make it concrete", (await concreteState()) === "disabled");
    await sleep(1200);
    await cdp.send("Page.reload");
    await cdp.waitFor(visibleChatButton("Give me a hint"));
    await cdp.clickSelector({ startsWith: "AI Chat" });
    await cdp.waitFor(visibleChatButton("Give me a hint"));
    check("a restored interrupted reply stays unavailable", (await concreteState()) === "disabled");

    await cdp.clickSelector({ text: "new" });
    await sleep(500);
    // Inject a partial failed stream through CDP, without changing the app route.
    let failNext = true;
    cdp.onEvent = (event) => {
      if (event.method !== "Fetch.requestPaused") return;
      const { requestId, request } = event.params;
      if (!failNext || request.method !== "POST") {
        void cdp.send("Fetch.continueRequest", { requestId }); return;
      }
      failNext = false;
      const chunks = [
        { type: "start", messageId: crypto.randomUUID() },
        { type: "text-start", id: "failed-text" },
        { type: "text-delta", id: "failed-text", delta: "Partial answer before a simulated failure." },
        { type: "error", errorText: "Acceptance test failure" },
      ];
      const body = chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n";
      void cdp.send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [
        { name: "content-type", value: "text/event-stream" },
        { name: "x-vercel-ai-ui-message-stream", value: "v1" },
      ], body: Buffer.from(body).toString("base64") });
    };
    await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*/api/chat", requestStage: "Request" }] });
    await cdp.clickSelector({ text: "Give me a hint" });
    check("failed partial stream exposes Retry", await cdp.waitFor(visibleChatButton("Retry")));
    check("a failed first reply does not unlock Make it concrete", (await concreteState()) === "disabled");
    await cdp.send("Fetch.disable");
    check("Retry is pressable", await cdp.clickSelector({ text: "Retry" }));
    check("Retry starts a fresh stream", await cdp.waitFor(stopped(), 8000));
    check("retry disables sending actions", await allActionsDisabled());
    check("Retry completes", await cdp.waitFor(idle(), 30000));
    check("a completed retry unlocks Make it concrete", (await concreteState()) === "enabled");

    await cdp.clickSelector({ startsWith: "More help" });
    await cdp.pressKey("ArrowDown", "ArrowDown", 40);
    check("keyboard focuses a help action", await cdp.evaluate(`document.activeElement?.getAttribute('role') === 'menuitem'`));
    const chosen = await cdp.evaluate(`document.activeElement.textContent.trim()`);
    await cdp.pressKey("Enter", "Enter", 13);
    check("Enter sends the selected help action", await cdp.waitFor(stopped(), 8000));
    check("keyboard help reply completes", await cdp.waitFor(idle(), 30000));
    check("keyboard selection used a secondary action", ["Explain it simply", "Review my code", "Why is this failing?", "Explain the complexity"].includes(chosen));
    await sleep(500);
    await cdp.send("Page.reload");
    await cdp.waitFor(visibleChatButton("Give me a hint"));
    await cdp.clickSelector({ startsWith: "AI Chat" });
    await cdp.waitFor(visibleChatButton("Give me a hint"));
    check("restored completed conversation unlocks Make it concrete", (await concreteState()) === "enabled");

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 430,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    // The workspace can re-mount on a layout change and drop the tab change.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const visible = await cdp.evaluate(
        `(() => {
          const panel = [...document.querySelectorAll('[role="tabpanel"]')]
            .find((node) => node.textContent.includes("Give me a hint"));
          return Boolean(panel) && !panel.hasAttribute("hidden")
            && panel.getBoundingClientRect().width > 0;
        })()`,
      );
      if (visible) break;
      await cdp.clickSelector({ startsWith: "AI Chat" });
      await sleep(1500);
    }
    await cdp.waitFor(visibleChatButton("Give me a hint"), 8000);
    await sleep(1000);
    const narrowState = await cdp.evaluate(`(() => {
      const chips = [...document.querySelectorAll('button')]
        .filter((node) => ['Give me a hint','Make it concrete','Show a tiny example'].includes(node.textContent.trim()))
        .filter((node) => node.getBoundingClientRect().width > 0);
      if (chips.length !== 3) return \`\${chips.length} visible chips\`;
      const row = chips[0].parentElement;
      if (row.scrollWidth > row.clientWidth + 1) return "action row overflows";
      const moreHelp = [...document.querySelectorAll('button')]
        .find((node) => node.textContent.trim().startsWith("More help"));
      if (!moreHelp || moreHelp.getBoundingClientRect().width === 0) return "More help hidden";
      return "ok";
    })()`);
    check("the action row fits a 430px pane", narrowState === "ok", narrowState);

    // Make sure the chat pane is the visible one before the screenshot.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const visible = await cdp.evaluate(
        `(() => {
          const panel = [...document.querySelectorAll('[role="tabpanel"]')]
            .find((node) => node.textContent.includes("Give me a hint"));
          return Boolean(panel) && !panel.hasAttribute("hidden")
            && panel.getBoundingClientRect().width > 0;
        })()`,
      );
      if (visible) break;
      await cdp.clickSelector({ startsWith: "AI Chat" });
      await sleep(1200);
    }
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(
      path.resolve(process.env.CHAT_CONTROLS_SCREENSHOT ?? "docs/plan/evals/phase15-chat-controls-corrected.png"),
      Buffer.from(shot.data, "base64"),
    );
    console.log("  saved corrected chat-controls screenshot");
  } catch (error) {
    check("browser acceptance completes", false, error.message);
  } finally {
    chrome.kill("SIGTERM");
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} of ${checks} checks failed.`);
    process.exitCode = 1;
    return;
  }
  console.log(`\nAll ${checks} checks passed.`);
}

await main();
process.exit(process.exitCode ?? 0);

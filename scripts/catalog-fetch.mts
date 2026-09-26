#!/usr/bin/env node

/**
 * Dev-time source fetcher for the NeetCode 150 import.
 *
 * Two modes:
 *
 *   pnpm catalog:fetch --manifest         rebuild docs/catalog/neetcode-150.json
 *   pnpm catalog:fetch --slug two-sum     write docs/catalog/sources/two-sum.json
 *   pnpm catalog:fetch --group "Stack"    every non-deferred problem in a group
 *   pnpm catalog:fetch --all              every non-deferred problem (slow)
 *
 * This is the only networked script in the repo, and it is never part of a
 * check. It writes two things and nothing else:
 *
 *   docs/catalog/neetcode-150.json   the reviewed sheet manifest (committed)
 *   docs/catalog/sources/*.json      per-problem snapshots (gitignored)
 *
 * It never writes under `lib/problems/` and it never writes to Postgres: a
 * snapshot is an authoring input, and the authored module is the artifact that
 * gets reviewed. Nothing here is run by `pnpm test`, `pnpm problems:check`,
 * seed, or the app.
 *
 * Sources:
 *   - the sheet (order + groups): the NeetCode roadmap, mirrored as TOML
 *   - metadata, statement HTML, starter, examples, constraints: LeetCode's
 *     public GraphQL endpoint, unauthenticated
 *   - reference solutions and articles: neetcode-gh/leetcode (MIT)
 *
 * Deferred problems (linked lists, trees, design classes, `void` contracts,
 * float returns, LeetCode-premium-only) are recorded in the manifest with a
 * reason and are not fetched for authoring. See `docs/catalog/README.md`.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  classify,
  type ArticleNotes,
  type ManifestProblem,
  type MetaData,
  type Snapshot,
} from "./catalog-sheet";

const SHEET_TOML =
  "https://raw.githubusercontent.com/lufftw/neetcode/refs/heads/main/roadmaps/neetcode_150.toml";
const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";
const LEETCODE_ALL = "https://leetcode.com/api/problems/all/";
const NEETCODE_RAW =
  "https://raw.githubusercontent.com/neetcode-gh/leetcode/main";
const NEETCODE_TREE =
  "https://api.github.com/repos/neetcode-gh/leetcode/git/trees/main?recursive=1";

const MANIFEST_PATH = "docs/catalog/neetcode-150.json";
const SOURCES_DIR = "docs/catalog/sources";

/**
 * #271 "Encode and Decode Strings" is in the sheet and missing from the TOML
 * mirror, which omits it because LeetCode sells it. A faithful 150 states it
 * explicitly and marks it deferred like the other premium problems.
 */
const SHEET_PATCHES = [{ group: "Arrays & Hashing", number: 271, ncName: "encode_and_decode_strings" }];

const CONCURRENCY = 4;
const REQUEST_SPACING_MS = 150;

const HEADERS = {
  "user-agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
};

type Question = {
  questionFrontendId: string;
  title: string;
  difficulty: string;
  isPaidOnly: boolean;
  content: string | null;
  metaData: string | null;
  codeSnippets: { langSlug: string; code: string }[] | null;
  exampleTestcases: string | null;
  topicTags: { slug: string; name: string }[] | null;
};

type Group = { name: string; order: number; problems: ManifestProblem[] };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { ...HEADERS, ...init?.headers } });
  if (!response.ok) {
    throw new Error(`${url} \u2192 HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

async function sleepUnlessLast(): Promise<void> {
  await sleep(REQUEST_SPACING_MS);
}

/** Groups in roadmap order, with the sheet patch folded in. */
function parseSheet(toml: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;

  for (const line of toml.split("\n")) {
    if (/^\s*\[\[groups\]\]/.test(line)) {
      current = { name: "", order: groups.length + 1, problems: [] };
      groups.push(current);
      continue;
    }
    const name = line.match(/^name\s*=\s*"(.+)"\s*$/);
    if (name && current && current.name === "") {
      current.name = name[1]!;
      continue;
    }
    const problem = line.match(/^\s*"(\d{4})_([a-z0-9_]+)",?\s*$/);
    if (problem && current) {
      current.problems.push({
        order: 0,
        group: current.name,
        groupOrder: current.order,
        number: Number(problem[1]),
        ncName: problem[2]!,
        slug: "",
        title: "",
        difficulty: "medium",
        status: "ready",
      });
    }
  }

  for (const patch of SHEET_PATCHES) {
    const group = groups.find((entry) => entry.name === patch.group);
    if (!group) throw new Error(`sheet patch names no group: ${patch.group}`);
    if (group.problems.some((problem) => problem.number === patch.number)) continue;
    group.problems.push({
      order: 0,
      group: group.name,
      groupOrder: group.order,
      number: patch.number,
      ncName: patch.ncName,
      slug: "",
      title: "",
      difficulty: "medium",
      status: "ready",
    });
  }

  let order = 0;
  for (const group of groups) {
    group.problems.sort((a, b) => a.number - b.number);
    for (const problem of group.problems) {
      problem.order = (order += 1);
    }
  }
  return groups;
}

async function leetcodeQuestion(slug: string): Promise<Question> {
  const query = [
    "query q($t: String!) {",
    "  question(titleSlug: $t) {",
    "    questionFrontendId",
    "    title",
    "    difficulty",
    "    isPaidOnly",
    "    content",
    "    metaData",
    "    codeSnippets { langSlug code }",
    "    exampleTestcases",
    "    topicTags { slug name }",
    "  }",
    "}",
  ].join("\n");

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const body = await fetchJson<{ data?: { question?: Question }; errors?: unknown }>(
        LEETCODE_GRAPHQL,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            referer: `https://leetcode.com/problems/${slug}/`,
          },
          body: JSON.stringify({ query, variables: { t: slug } }),
        },
      );
      if (body.data?.question) return body.data.question;
      if (attempt === 3) {
        throw new Error(`no question for ${slug}: ${JSON.stringify(body.errors ?? body)}`);
      }
    } catch (error) {
      if (attempt === 3) throw error;
    }
    await sleep(600 * attempt);
  }
  throw new Error(`unreachable: ${slug}`);
}

/** `Easy` / `MEDIUM` → the sheet's `difficulty` union. */
function difficultyOf(value: string): "easy" | "medium" | "hard" {
  const normalised = value.trim().toLowerCase();
  if (normalised.startsWith("easy")) return "easy";
  if (normalised.startsWith("hard")) return "hard";
  return "medium";
}

async function readManifest(): Promise<{ groups: string[]; problems: ManifestProblem[] }> {
  const raw = await readFile(MANIFEST_PATH, "utf8");
  const parsed = JSON.parse(raw) as { groups: string[]; problems: ManifestProblem[] };
  return parsed;
}

async function writeManifest(groups: Group[]): Promise<void> {
  const problems = groups.flatMap((group) => group.problems);
  const payload = {
    _note:
      "Vendored NeetCode 150 sheet: roadmap order, groups, and the harness verdict per problem. " +
      "Regenerate with `pnpm catalog:fetch --manifest`, then review the diff. " +
      "`ready` problems are authored under lib/problems/; `deferred` problems carry the reason.",
    sheetSource: "https://neetcode.io/roadmap (mirrored as TOML by lufftw/neetcode)",
    problemSource: "https://leetcode.com/graphql + https://github.com/neetcode-gh/leetcode (MIT)",
    total: problems.length,
    groups: groups.map((group) => group.name),
    problems,
  };
  await writeFile(MANIFEST_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  const ready = problems.filter((problem) => problem.status === "ready").length;
  console.log(
    `Wrote ${MANIFEST_PATH}: ${problems.length} problems ` +
      `(${ready} ready, ${problems.length - ready} deferred) in ${groups.length} groups.`,
  );
}

async function buildManifest(): Promise<void> {
  const toml = await (await fetch(SHEET_TOML, { headers: HEADERS })).text();
  const groups = parseSheet(toml);
  const all = await fetchJson<{
    stat_status_pairs: {
      stat: { frontend_question_id: number; question__title_slug: string };
      paid_only: boolean;
      difficulty: { level: number };
    }[];
  }>(LEETCODE_ALL);

  const byNumber = new Map<number, { slug: string; paidOnly: boolean; level: number }>();
  for (const entry of all.stat_status_pairs) {
    byNumber.set(entry.stat.frontend_question_id, {
      slug: entry.stat.question__title_slug,
      paidOnly: entry.paid_only,
      level: entry.difficulty.level,
    });
  }

  const problems = groups.flatMap((group) => group.problems);
  console.log(`Classifying ${problems.length} sheet problems against the harness…`);

  let index = 0;
  const LEVELS: Record<number, "easy" | "medium" | "hard"> = {
    1: "easy",
    2: "medium",
    3: "hard",
  };

  async function worker(): Promise<void> {
    while (index < problems.length) {
      const position = index++;
      const problem = problems[position]!;
      const mapped = byNumber.get(problem.number);
      if (!mapped) throw new Error(`no LeetCode slug for #${problem.number}`);
      problem.slug = mapped.slug;

      const question = await leetcodeQuestion(mapped.slug);
      problem.title = question.title;
      problem.difficulty = difficultyOf(
        question.difficulty || LEVELS[mapped.level] || "medium",
      );
      const meta = JSON.parse(question.metaData ?? "{}") as MetaData;
      const verdict = classify(question, meta, problem.slug);
      problem.status = verdict.status;
      if (verdict.reason) problem.reason = verdict.reason;
      else delete problem.reason;

      console.log(
        `  ${problem.status === "ready" ? "ready   " : "deferred"} ` +
          `${String(problem.number).padStart(4)} ${problem.slug}` +
          (verdict.reason ? ` (${verdict.reason})` : ""),
      );
      await sleepUnlessLast();
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const slugs = problems.map((problem) => problem.slug);
  if (new Set(slugs).size !== slugs.length) {
    throw new Error("the sheet classified two different numbers onto one slug");
  }
  await writeManifest(groups);
}

/** `<sup>4</sup>` → `⁴`, so constraints read like the existing modules. */
const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
  n: "ⁿ",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function htmlToText(value: string): string {
  return decodeEntities(
    value
      .replace(/<sup>([^<]*)<\/sup>/g, (_match, body: string) =>
        [...body].map((char) => SUPERSCRIPTS[char] ?? char).join(""),
      )
      .replace(/<code>([^<]*)<\/code>/g, "`$1`")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The constraint list is factual and lives in one `<ul>` after a
 * "Constraints:" label. Extraction prints for review; it never invents a bound
 * and returns nothing when the label is absent.
 */
function extractConstraints(html: string): string[] {
  const label = html.search(/Constraints:?/);
  if (label < 0) return [];
  const list = html.slice(label).match(/<ul>([\s\S]*?)<\/ul>/);
  if (!list) return [];
  return [...list[1]!.matchAll(/<li>([\s\S]*?)<\/li>/g)]
    .map((match) => htmlToText(match[1]!))
    .filter((line) => line.length > 0);
}

function normaliseName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function tokensOf(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((token) => token.length > 2);
}

/** `$O(n)$` → `O(n)`; the articles wrap complexity in LaTeX. */
function plainComplexity(value: string): string {
  return value.replace(/\$/g, "").trim();
}

/**
 * The optimal section's Intuition prose, as a single paragraph, plus its
 * complexity lines. Article names follow NeetCode's own slugs, so an exact
 * match is tried first and token overlap is reported as candidates rather than
 * silently picking one.
 */
function notesFromArticle(markdown: string): ArticleNotes {
  const sections = markdown.split(/^##\s+/m).filter((section) => section.trim().length > 0);
  const withComplexity = sections.filter((section) =>
    /###\s*Time & Space Complexity/.test(section),
  );
  const optimal = withComplexity[withComplexity.length - 1] ?? sections[sections.length - 1];
  if (!optimal) return { approach: null, timeComplexity: null, spaceComplexity: null };

  const intuition = optimal.match(/###\s*Intuition\s*\n+([\s\S]*?)(?:\n\n|\n###)/);
  const approach = intuition
    ? htmlToText(intuition[1]!.replace(/\n+/g, " ").replace(/`/g, ""))
    : null;

  const time = optimal.match(/-\s*Time complexity:\s*([^\n]+)/);
  const space = optimal.match(/-\s*Space complexity:\s*([^\n]+)/);

  return {
    approach: approach && approach.length > 0 ? approach : null,
    timeComplexity: time ? plainComplexity(time[1]!) : null,
    spaceComplexity: space ? plainComplexity(space[1]!) : null,
  };
}

async function neetcodeTree(): Promise<{
  python: Map<string, string>;
  articles: string[];
}> {
  const tree = await fetchJson<{ tree: { path: string; type: string }[] }>(NEETCODE_TREE);
  const python = new Map<string, string>();
  const articles: string[] = [];
  for (const entry of tree.tree) {
    if (entry.type !== "blob") continue;
    const pythonMatch = entry.path.match(/^python\/(\d{4})-(.+)\.py$/);
    if (pythonMatch) python.set(pythonMatch[1]!, entry.path);
    if (entry.path.startsWith("articles/") && entry.path.endsWith(".md")) {
      articles.push(entry.path.slice("articles/".length, -".md".length));
    }
  }
  return { python, articles };
}

async function rawOrNull(path: string): Promise<string | null> {
  const response = await fetch(`${NEETCODE_RAW}/${path}`, { headers: HEADERS });
  if (!response.ok) return null;
  return await response.text();
}

/**
 * Which article belongs to this problem.
 *
 * NeetCode names its articles after its own slugs, and a few of them read
 * nothing like the LeetCode title — "Top K Frequent Elements" is
 * `top-k-elements-in-list`. Fuzzy names are therefore *candidates*, never a
 * match on their own: each candidate is fetched and accepted only when its
 * solution code defines this problem's method. That check is what stops
 * `valid-palindrome` from picking up `valid-palindrome-ii`, which token overlap
 * scores as a perfect match.
 *
 * An exact slug match is kept as a name-proof fallback when no candidate
 * verifies, and `verified` records which kind of match it was.
 */
async function chooseArticle(
  problem: ManifestProblem,
  articleNames: readonly string[],
  methodName: string,
): Promise<{ path: string | null; markdown: string | null; verified: boolean; candidates: string[] }> {
  const wanted = normaliseName(problem.title);
  const titleTokens = new Set(tokensOf(problem.title));

  const exact = articleNames.filter((name) => normaliseName(name) === wanted);
  const subset = articleNames.filter((name) => {
    const tokens = tokensOf(name);
    return tokens.length > 0 && tokens.every((token) => titleTokens.has(token));
  });
  const overlap = articleNames
    .map((name) => ({
      name,
      score: tokensOf(name).filter((token) => titleTokens.has(token)).length,
    }))
    .filter((entry) => entry.score >= 2)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.name);

  const candidates = [...new Set([...exact, ...subset, ...overlap])].slice(0, 6);
  const needle = methodName.length > 0 ? `def ${methodName}(` : null;

  let path: string | null = null;
  let markdown: string | null = null;
  const verified = false;

  for (const candidate of candidates) {
    const text = await rawOrNull(`articles/${candidate}.md`);
    if (!text) continue;
    if (needle && text.includes(needle)) {
      return { path: candidate, markdown: text, verified: true, candidates };
    }
    // A name match is evidence of its own, but weaker than the code check.
    if (!path && exact.includes(candidate)) {
      path = candidate;
      markdown = text;
    }
  }

  return { path, markdown, verified, candidates };
}

async function buildSnapshot(
  problem: ManifestProblem,
  sources: { python: Map<string, string>; articles: string[] },
): Promise<void> {
  const question = await leetcodeQuestion(problem.slug);
  const metaData = JSON.parse(question.metaData ?? "{}") as MetaData;
  const pythonStarter =
    question.codeSnippets?.find((snippet) => snippet.langSlug === "python3")?.code ?? "";

  const referencePath = sources.python.get(String(problem.number).padStart(4, "0")) ?? null;
  const referencePython = referencePath ? await rawOrNull(referencePath) : null;

  const article = await chooseArticle(
    problem,
    sources.articles,
    metaData.name ?? "",
  );

  const statementHtml = question.content ?? "";
  const snapshot: Snapshot = {
    slug: problem.slug,
    number: problem.number,
    title: question.title,
    difficulty: question.difficulty,
    isPaidOnly: question.isPaidOnly,
    topicTags: (question.topicTags ?? []).map((tag) => tag.slug),
    metaData,
    pythonStarter,
    exampleTestcases: (question.exampleTestcases ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
    statementHtml,
    constraints: extractConstraints(statementHtml),
    referencePython,
    referencePath,
    articleMarkdown: article.markdown,
    articlePath: article.path,
    articleVerified: article.verified,
    articleCandidates: article.candidates,
    notes: article.markdown
      ? notesFromArticle(article.markdown)
      : { approach: null, timeComplexity: null, spaceComplexity: null },
  };

  await writeFile(
    join(SOURCES_DIR, `${problem.slug}.json`),
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `  ${problem.slug}: ${snapshot.exampleTestcases.length} example values, ` +
      `${snapshot.constraints.length} constraints, ` +
      `reference ${referencePath ?? "MISSING"}, ` +
      `article ${article.path ?? "none"}${article.verified ? "" : " (unverified)"}`,
  );
}

function parseArgs(argv: string[]): {
  mode: "manifest" | "fetch";
  slug?: string;
  group?: string;
  all: boolean;
  force: boolean;
} {
  const args: { mode: "manifest" | "fetch"; slug?: string; group?: string; all: boolean; force: boolean } = {
    mode: "fetch",
    all: false,
    force: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (arg === "--manifest") args.mode = "manifest";
    else if (arg === "--all") args.all = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--slug") args.slug = argv[++index];
    else if (arg === "--group") args.group = argv[++index];
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(SOURCES_DIR, { recursive: true });

  if (args.mode === "manifest") {
    await buildManifest();
    return;
  }

  const manifest = await readManifest();
  let wanted = manifest.problems.filter((problem) => problem.status === "ready");
  if (args.slug) {
    wanted = manifest.problems.filter((problem) => problem.slug === args.slug);
    if (wanted.length === 0) throw new Error(`${args.slug} is not in the sheet`);
  } else if (args.group) {
    wanted = wanted.filter((problem) => problem.group === args.group);
    if (wanted.length === 0) throw new Error(`no ready problems in group ${args.group}`);
  } else if (!args.all) {
    throw new Error(
      "choose a target: --slug <slug>, --group <group>, --all, or --manifest",
    );
  }

  if (!args.force) {
    const kept: ManifestProblem[] = [];
    for (const problem of wanted) {
      try {
        await readFile(join(SOURCES_DIR, `${problem.slug}.json`), "utf8");
        console.log(`  ${problem.slug}: snapshot exists (use --force to refetch)`);
      } catch {
        kept.push(problem);
      }
    }
    wanted = kept;
  }

  if (wanted.length === 0) {
    console.log("Nothing to fetch.");
    return;
  }

  console.log(`Fetching ${wanted.length} snapshot(s) into ${SOURCES_DIR}…`);
  const sources = await neetcodeTree();
  let index = 0;
  async function worker(): Promise<void> {
    while (index < wanted.length) {
      const problem = wanted[index++]!;
      await buildSnapshot(problem, sources);
      await sleepUnlessLast();
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log("Done. Snapshots are gitignored; the authored modules are the artifact.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

/** Independent, intentionally small-input checks for the graph catalog batch. */
import type { ArgValue } from "@/lib/harness/args";

const encode = (value: unknown): string => JSON.stringify(value);

function numberGrid(value: unknown, maxSide = 12): number[][] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxSide) return null;
  const rows: number[][] = [];
  for (const row of value) {
    if (!Array.isArray(row) || row.length === 0 || row.length > maxSide) return null;
    if (!row.every((cell) => typeof cell === "number" && Number.isInteger(cell))) return null;
    rows.push(row as number[]);
  }
  return rows.every((row) => row.length === rows[0]!.length) ? rows : null;
}

function characterGrid(value: unknown): string[][] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 12) return null;
  const rows: string[][] = [];
  for (const row of value) {
    if (!Array.isArray(row) || row.length === 0 || row.length > 12) return null;
    if (!row.every((cell) => cell === "0" || cell === "1")) return null;
    rows.push(row as string[]);
  }
  return rows.every((row) => row.length === rows[0]!.length) ? rows : null;
}

function rowsOfNumbers(value: unknown, width: number, maxRows = 12): number[][] | null {
  if (!Array.isArray(value) || value.length > maxRows) return null;
  const rows: number[][] = [];
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== width) return null;
    if (!row.every((entry) => typeof entry === "number" && Number.isInteger(entry))) return null;
    rows.push(row as number[]);
  }
  return rows;
}

function components(grid: number[][] | string[][]): number[] {
  const rows = grid.length;
  const columns = grid[0]!.length;
  const visited = grid.map((row) => row.map(() => false));
  const sizes: number[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < columns; c += 1) {
      if (visited[r]![c] || (grid[r]![c] !== 1 && grid[r]![c] !== "1")) continue;
      const queue: [number, number][] = [[r, c]];
      visited[r]![c] = true;
      let area = 0;
      for (let head = 0; head < queue.length; head += 1) {
        const [row, column] = queue[head]!;
        area += 1;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nr = row + dr!;
          const nc = column + dc!;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= columns || visited[nr]![nc]) continue;
          if (grid[nr]![nc] !== 1 && grid[nr]![nc] !== "1") continue;
          visited[nr]![nc] = true;
          queue.push([nr, nc]);
        }
      }
      sizes.push(area);
    }
  }
  return sizes;
}

function islands(args: readonly ArgValue[]): string | null {
  const grid = characterGrid(args[0]);
  return grid ? encode(components(grid).length) : null;
}

function maxArea(args: readonly ArgValue[]): string | null {
  const grid = numberGrid(args[0]);
  if (!grid || grid.some((row) => row.some((cell) => cell !== 0 && cell !== 1))) return null;
  return encode(Math.max(0, ...components(grid)));
}

/** Check each cell by ordinary downhill walks, instead of the reference's reverse walks. */
function pacificAtlantic(args: readonly ArgValue[]): string | null {
  const heights = numberGrid(args[0]);
  if (!heights) return null;
  const rows = heights.length;
  const columns = heights[0]!.length;
  const reaches = (startR: number, startC: number, pacific: boolean): boolean => {
    const queue: [number, number][] = [[startR, startC]];
    const seen = new Set([`${startR},${startC}`]);
    for (let head = 0; head < queue.length; head += 1) {
      const [r, c] = queue[head]!;
      if (pacific ? r === 0 || c === 0 : r === rows - 1 || c === columns - 1) return true;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr!;
        const nc = c + dc!;
        const key = `${nr},${nc}`;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= columns || seen.has(key)) continue;
        if (heights[nr]![nc]! > heights[r]![c]!) continue;
        seen.add(key);
        queue.push([nr, nc]);
      }
    }
    return false;
  };
  const answer: number[][] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < columns; c += 1) {
      if (reaches(r, c, true) && reaches(r, c, false)) answer.push([r, c]);
    }
  }
  return encode(answer);
}

function rottingOranges(args: readonly ArgValue[]): string | null {
  const input = numberGrid(args[0]);
  if (!input || input.some((row) => row.some((cell) => cell < 0 || cell > 2))) return null;
  const grid = input.map((row) => [...row]);
  let minutes = 0;
  while (true) {
    const fresh: [number, number][] = [];
    for (let r = 0; r < grid.length; r += 1) {
      for (let c = 0; c < grid[0]!.length; c += 1) {
        if (grid[r]![c] !== 1) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dr, dc]) => grid[r + dr!]?.[c + dc!] === 2)) {
          fresh.push([r, c]);
        }
      }
    }
    if (fresh.length === 0) return encode(grid.some((row) => row.includes(1)) ? -1 : minutes);
    for (const [r, c] of fresh) grid[r]![c] = 2;
    minutes += 1;
  }
}

type Topology = { cycle: boolean; unique: boolean; order: number[] };
function topology(numCourses: number, prerequisites: number[][]): Topology {
  const outgoing = Array.from({ length: numCourses }, () => [] as number[]);
  const indegree = Array.from({ length: numCourses }, () => 0);
  for (const [course, prerequisite] of prerequisites) {
    outgoing[prerequisite]!.push(course);
    indegree[course]! += 1;
  }
  const order: number[] = [];
  let unique = true;
  while (order.length < numCourses) {
    const available = indegree.flatMap((degree, course) => degree === 0 ? [course] : []);
    if (available.length === 0) return { cycle: true, unique: false, order: [] };
    if (available.length !== 1) unique = false;
    const course = available[0]!;
    order.push(course);
    indegree[course] = -1;
    for (const next of outgoing[course]!) indegree[next]! -= 1;
  }
  return { cycle: false, unique, order };
}

function courses(args: readonly ArgValue[], requireUnique: boolean): string | null {
  const n = args[0];
  const prerequisites = rowsOfNumbers(args[1], 2);
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 12 || !prerequisites) return null;
  const result = topology(n, prerequisites);
  if (!requireUnique) return encode(!result.cycle);
  if (result.cycle) return encode([]);
  return result.unique ? encode(result.order) : null;
}

function redundantConnection(args: readonly ArgValue[]): string | null {
  const edges = rowsOfNumbers(args[0], 2);
  if (!edges || edges.length === 0) return null;
  const graph = new Map<number, number[]>();
  for (const [a, b] of edges) {
    const seen = new Set([a!]);
    const queue = [a!];
    for (let head = 0; head < queue.length; head += 1) {
      const node = queue[head]!;
      for (const next of graph.get(node) ?? []) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
    if (seen.has(b!)) return encode([a, b]);
    graph.set(a!, [...(graph.get(a!) ?? []), b!]);
    graph.set(b!, [...(graph.get(b!) ?? []), a!]);
  }
  return null;
}

function wordLadder(args: readonly ArgValue[]): string | null {
  const [begin, end, rawWords] = args;
  if (typeof begin !== "string" || typeof end !== "string" || !Array.isArray(rawWords) || rawWords.length > 12) return null;
  if (!rawWords.every((word) => typeof word === "string" && word.length === begin.length)) return null;
  const words = rawWords as string[];
  if (!words.includes(end)) return encode(0);
  const queue: [string, number][] = [[begin, 1]];
  const seen = new Set([begin]);
  for (let head = 0; head < queue.length; head += 1) {
    const [word, length] = queue[head]!;
    if (word === end) return encode(length);
    for (const next of words) {
      let differences = 0;
      for (let i = 0; i < word.length && differences < 2; i += 1) if (word[i] !== next[i]) differences += 1;
      if (differences === 1 && !seen.has(next)) { seen.add(next); queue.push([next, length + 1]); }
    }
  }
  return encode(0);
}

function itinerary(args: readonly ArgValue[]): string | null {
  const value = args[0];
  if (!Array.isArray(value) || value.length === 0 || value.length > 8) return null;
  const tickets: [string, string][] = [];
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== 2 || !row.every((airport) => typeof airport === "string")) return null;
    tickets.push(row as [string, string]);
  }
  const routes: string[][] = [];
  const used = tickets.map(() => false);
  const route = ["JFK"];
  const search = (airport: string): void => {
    if (route.length === tickets.length + 1) { routes.push([...route]); return; }
    for (let i = 0; i < tickets.length; i += 1) {
      if (used[i] || tickets[i]![0] !== airport) continue;
      used[i] = true;
      route.push(tickets[i]![1]);
      search(tickets[i]![1]);
      route.pop();
      used[i] = false;
    }
  };
  search("JFK");
  routes.sort((a, b) => a.join(",").localeCompare(b.join(",")));
  return encode(routes[0] ?? []);
}

function minCostPoints(args: readonly ArgValue[]): string | null {
  const points = args[0];
  if (!Array.isArray(points) || points.length === 0 || points.length > 8) return null;
  if (!points.every((point) => Array.isArray(point) && point.length === 2 && point.every((v) => typeof v === "number" && Number.isInteger(v)))) return null;
  const pts = points as [number, number][];
  const edges: { a: number; b: number; cost: number }[] = [];
  for (let a = 0; a < pts.length; a += 1) for (let b = a + 1; b < pts.length; b += 1) {
    edges.push({ a, b, cost: Math.abs(pts[a]![0] - pts[b]![0]) + Math.abs(pts[a]![1] - pts[b]![1]) });
  }
  edges.sort((a, b) => a.cost - b.cost);
  const parent = pts.map((_, i) => i);
  const find = (x: number): number => parent[x] === x ? x : (parent[x] = find(parent[x]!));
  let total = 0;
  let links = 0;
  for (const edge of edges) {
    const a = find(edge.a); const b = find(edge.b);
    if (a === b) continue;
    parent[a] = b; total += edge.cost; links += 1;
    if (links === pts.length - 1) break;
  }
  return encode(total);
}

function networkDelay(args: readonly ArgValue[]): string | null {
  const edges = rowsOfNumbers(args[0], 3);
  const [n, start] = [args[1], args[2]];
  if (!edges || typeof n !== "number" || typeof start !== "number" || !Number.isInteger(n) || n < 1 || n > 12) return null;
  const distance = Array.from({ length: n + 1 }, () => Number.POSITIVE_INFINITY);
  distance[start] = 0;
  for (let pass = 1; pass < n; pass += 1) {
    let changed = false;
    for (const [from, to, weight] of edges) {
      if (Number.isFinite(distance[from!]!) && distance[from!]! + weight! < distance[to!]!) {
        distance[to!] = distance[from!]! + weight!;
        changed = true;
      }
    }
    if (!changed) break;
  }
  const answer = Math.max(...distance.slice(1));
  return encode(Number.isFinite(answer) ? answer : -1);
}

function swim(args: readonly ArgValue[]): string | null {
  const grid = numberGrid(args[0], 8);
  if (!grid || grid.length !== grid[0]!.length) return null;
  const n = grid.length;
  const reachable = (limit: number): boolean => {
    if (grid[0]![0]! > limit) return false;
    const seen = new Set(["0,0"]);
    const queue: [number, number][] = [[0, 0]];
    for (let head = 0; head < queue.length; head += 1) {
      const [r, c] = queue[head]!;
      if (r === n - 1 && c === n - 1) return true;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr!; const nc = c + dc!; const key = `${nr},${nc}`;
        if (nr < 0 || nr >= n || nc < 0 || nc >= n || seen.has(key) || grid[nr]![nc]! > limit) continue;
        seen.add(key); queue.push([nr, nc]);
      }
    }
    return false;
  };
  let low = Math.max(grid[0]![0]!, grid[n - 1]![n - 1]!);
  let high = Math.max(...grid.flat());
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (reachable(mid)) high = mid; else low = mid + 1;
  }
  return encode(low);
}

function cheapestFlights(args: readonly ArgValue[]): string | null {
  const n = args[0]; const flights = rowsOfNumbers(args[1], 3); const src = args[2]; const dst = args[3]; const stops = args[4];
  if (typeof n !== "number" || !Number.isInteger(n) || n < 2 || n > 12 || !flights || typeof src !== "number" || typeof dst !== "number" || typeof stops !== "number") return null;
  let prices = Array.from({ length: n }, () => Number.POSITIVE_INFINITY);
  prices[src] = 0;
  for (let flight = 0; flight <= stops; flight += 1) {
    const next = [...prices];
    for (const [from, to, price] of flights) {
      if (Number.isFinite(prices[from!]!) && prices[from!]! + price! < next[to!]!) next[to!] = prices[from!]! + price!;
    }
    prices = next;
  }
  return encode(Number.isFinite(prices[dst]!) ? prices[dst] : -1);
}

export function graphOracleAnswer(slug: string, args: readonly ArgValue[]): string | null {
  switch (slug) {
    case "number-of-islands": return islands(args);
    case "max-area-of-island": return maxArea(args);
    case "pacific-atlantic-water-flow": return pacificAtlantic(args);
    case "rotting-oranges": return rottingOranges(args);
    case "course-schedule": return courses(args, false);
    case "course-schedule-ii": return courses(args, true);
    case "redundant-connection": return redundantConnection(args);
    case "word-ladder": return wordLadder(args);
    case "reconstruct-itinerary": return itinerary(args);
    case "min-cost-to-connect-all-points": return minCostPoints(args);
    case "network-delay-time": return networkDelay(args);
    case "swim-in-rising-water": return swim(args);
    case "cheapest-flights-within-k-stops": return cheapestFlights(args);
    default: return null;
  }
}

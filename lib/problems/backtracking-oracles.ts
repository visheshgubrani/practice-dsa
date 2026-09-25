/** Independent small-input oracles for the Backtracking catalog batch. */
import type { ArgValue } from "@/lib/harness/args";

const json = (value: unknown): string => JSON.stringify(value);

function numbers(value: unknown, max = 8): number[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  return value.every((entry) => typeof entry === "number" && Number.isInteger(entry))
    ? value as number[]
    : null;
}

function subsets(args: readonly ArgValue[]): string | null {
  const nums = numbers(args[0]);
  if (!nums) return null;
  const result: number[][] = [];
  const current: number[] = [];
  const visit = (index: number): void => {
    if (index === nums.length) {
      result.push([...current]);
      return;
    }
    current.push(nums[index]!);
    visit(index + 1);
    current.pop();
    visit(index + 1);
  };
  visit(0);
  return json(result);
}

function uniqueSubsets(args: readonly ArgValue[]): string | null {
  const nums = numbers(args[0]);
  if (!nums) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const result: number[][] = [];
  const current: number[] = [];
  const visit = (index: number): void => {
    result.push([...current]);
    for (let i = index; i < sorted.length; i += 1) {
      if (i > index && sorted[i] === sorted[i - 1]) continue;
      current.push(sorted[i]!);
      visit(i + 1);
      current.pop();
    }
  };
  visit(0);
  return json(result);
}

function permutations(args: readonly ArgValue[]): string | null {
  const nums = numbers(args[0], 7);
  if (!nums || nums.length === 0) return null;
  const result: number[][] = [];
  const current: number[] = [];
  const used = nums.map(() => false);
  const visit = (): void => {
    if (current.length === nums.length) {
      result.push([...current]);
      return;
    }
    for (let i = 0; i < nums.length; i += 1) {
      if (used[i]) continue;
      used[i] = true;
      current.push(nums[i]!);
      visit();
      current.pop();
      used[i] = false;
    }
  };
  visit();
  return json(result);
}

function combinationSum(args: readonly ArgValue[], reuse: boolean): string | null {
  const candidates = numbers(args[0], 10);
  const target = args[1];
  if (!candidates || candidates.length === 0 || typeof target !== "number" || !Number.isInteger(target) || target < 1 || target > 30) return null;
  if (candidates.some((value) => value < 1)) return null;
  const values = [...candidates].sort((a, b) => a - b);
  const result: number[][] = [];
  const seen = new Set<string>();
  const current: number[] = [];
  const visit = (start: number, remaining: number): void => {
    if (remaining === 0) {
      const key = JSON.stringify(current);
      if (!seen.has(key)) { seen.add(key); result.push([...current]); }
      return;
    }
    for (let i = start; i < values.length; i += 1) {
      const value = values[i]!;
      if (value > remaining) break;
      current.push(value);
      visit(reuse ? i : i + 1, remaining - value);
      current.pop();
    }
  };
  visit(0, target);
  return json(result);
}

function board(value: unknown): string[][] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 6) return null;
  const rows = value as unknown[];
  if (!rows.every((row) => Array.isArray(row) && row.length > 0 && row.length <= 6 && (row as unknown[]).every((cell) => typeof cell === "string" && cell.length === 1))) return null;
  const width = (rows[0] as unknown[]).length;
  if (!rows.every((row) => (row as unknown[]).length === width)) return null;
  return rows as string[][];
}

function wordSearch(args: readonly ArgValue[]): string | null {
  const grid = board(args[0]);
  const word = args[1];
  if (!grid || typeof word !== "string" || word.length === 0 || word.length > 10) return null;
  const rows = grid.length;
  const columns = grid[0]!.length;
  const seen = new Set<string>();
  const visit = (row: number, column: number, index: number): boolean => {
    if (index === word.length) return true;
    const key = `${row},${column}`;
    if (row < 0 || row >= rows || column < 0 || column >= columns || seen.has(key) || grid[row]![column] !== word[index]) return false;
    seen.add(key);
    const found = visit(row + 1, column, index + 1) || visit(row - 1, column, index + 1) || visit(row, column + 1, index + 1) || visit(row, column - 1, index + 1);
    seen.delete(key);
    return found;
  };
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) if (visit(row, column, 0)) return json(true);
  return json(false);
}

function palindromePartitioning(args: readonly ArgValue[]): string | null {
  const value = args[0];
  if (typeof value !== "string" || value.length > 10) return null;
  const result: string[][] = [];
  const current: string[] = [];
  const isPalindrome = (text: string): boolean => text === [...text].reverse().join("");
  const visit = (index: number): void => {
    if (index === value.length) {
      result.push([...current]);
      return;
    }
    for (let end = index + 1; end <= value.length; end += 1) {
      const part = value.slice(index, end);
      if (!isPalindrome(part)) continue;
      current.push(part);
      visit(end);
      current.pop();
    }
  };
  visit(0);
  return json(result);
}

function letterCombinations(args: readonly ArgValue[]): string | null {
  const digits = args[0];
  if (typeof digits !== "string" || digits.length > 4 || !/^[2-9]*$/.test(digits)) return null;
  const map: Record<string, string> = { "2": "abc", "3": "def", "4": "ghi", "5": "jkl", "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz" };
  const result: string[] = [];
  const visit = (index: number, current: string): void => {
    if (index === digits.length) {
      if (current.length > 0) result.push(current);
      return;
    }
    for (const char of map[digits[index]!]!) visit(index + 1, current + char);
  };
  if (digits.length > 0) visit(0, "");
  return json(result);
}

function nQueens(args: readonly ArgValue[]): string | null {
  const n = args[0];
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 6) return null;
  const result: string[][] = [];
  const columns = new Set<number>();
  const positive = new Set<number>();
  const negative = new Set<number>();
  const placement: number[] = [];
  const visit = (row: number): void => {
    if (row === n) {
      result.push(placement.map((column) => ".".repeat(column) + "Q" + ".".repeat(n - column - 1)));
      return;
    }
    for (let column = 0; column < n; column += 1) {
      if (columns.has(column) || positive.has(row + column) || negative.has(row - column)) continue;
      columns.add(column); positive.add(row + column); negative.add(row - column); placement.push(column);
      visit(row + 1);
      placement.pop(); columns.delete(column); positive.delete(row + column); negative.delete(row - column);
    }
  };
  visit(0);
  return json(result);
}

export function backtrackingOracleAnswer(slug: string, args: readonly ArgValue[]): string | null {
  switch (slug) {
    case "subsets": return subsets(args);
    case "combination-sum": return combinationSum(args, true);
    case "permutations": return permutations(args);
    case "subsets-ii": return uniqueSubsets(args);
    case "combination-sum-ii": return combinationSum(args, false);
    case "word-search": return wordSearch(args);
    case "palindrome-partitioning": return palindromePartitioning(args);
    case "letter-combinations-of-a-phone-number": return letterCombinations(args);
    case "n-queens": return nQueens(args);
    default: return null;
  }
}

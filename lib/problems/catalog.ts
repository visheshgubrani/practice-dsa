/**
 * Seed input: the authored catalog, assembled from per-problem modules.
 *
 * Not the app's data source — pages, the runner, and the chat route read
 * Postgres. Editing a module only takes effect after `pnpm db:seed`.
 *
 * Do not import this from client code. `@/lib/problems` is the public
 * interface and does not re-export the catalog.
 */

import type { AuthoredProblem } from "./authoring";
import { groupAnagrams } from "./group-anagrams";
import { trappingRainWater } from "./trapping-rain-water";
import { twoSum } from "./two-sum";
import { validParentheses } from "./valid-parentheses";

export const PROBLEMS: readonly AuthoredProblem[] = [
  twoSum,
  validParentheses,
  groupAnagrams,
  trappingRainWater,
];

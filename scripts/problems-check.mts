#!/usr/bin/env node

/**
 * Docker-free catalog conformance.
 *
 * Runs repository-authored Python reference solutions locally against every
 * visible and hidden case, using the production harness and comparator.
 * Missing expectations print a candidate and fail until they are added by
 * hand. Mismatches are never rewritten.
 *
 * Requires Python 3. Does not need Postgres or Docker.
 *
 * Usage: pnpm problems:check
 */

import { PROBLEMS } from "@/lib/problems/catalog";
import {
  checkCatalog,
  formatConformanceReport,
} from "@/lib/problems/conformance";

const report = checkCatalog(PROBLEMS);
console.log(formatConformanceReport(report));
if (!report.ok) {
  process.exitCode = 1;
}

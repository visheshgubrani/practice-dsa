import { timestamp } from "drizzle-orm/pg-core";

/**
 * Timestamp fragments shared by every table.
 *
 * A drizzle column builder is a template, not a column: `pgTable` builds a fresh
 * column per table, so spreading the same fragment into several tables is safe
 * and each table still gets its own instance. Every timestamp is `timestamptz`,
 * so the values are absolute rather than dependent on the server's zone.
 */

/** Row creation time, set by the database. */
export const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow();

/**
 * Last write time. `$onUpdate` fires for writes that go through Drizzle, which
 * is every write this app makes; the column default still covers raw SQL.
 */
export const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

export const timestamps = { createdAt, updatedAt };

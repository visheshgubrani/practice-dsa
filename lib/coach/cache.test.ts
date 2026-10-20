import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  COACH_NOTE_KEY,
  isCoachMinutesValue,
  readCachedNote,
  writeCachedNote,
} from "./cache";

function storage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(COACH_NOTE_KEY, initial);
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("coach note cache", () => {
  it("round-trips a note for the same fingerprint", () => {
    const store = storage();
    writeCachedNote("a1b2c3d4", "Start with the first review.", store);

    assert.equal(readCachedNote("a1b2c3d4", store), "Start with the first review.");
  });

  it("ignores another plan's note, corrupt JSON, and invalid prose", () => {
    const other = storage(
      JSON.stringify({ fingerprint: "ffffffff", note: "Other plan." }),
    );
    assert.equal(readCachedNote("a1b2c3d4", other), null);

    assert.equal(readCachedNote("a1b2c3d4", storage("{not json")), null);
    assert.equal(
      readCachedNote(
        "a1b2c3d4",
        storage(
          JSON.stringify({ fingerprint: "a1b2c3d4", note: "Start with 2 items." }),
        ),
      ),
      null,
    );
    assert.equal(
      readCachedNote(
        "a1b2c3d4",
        storage(
          JSON.stringify({ fingerprint: "a1b2c3d4", note: "Start **now**." }),
        ),
      ),
      null,
    );
  });

  it("does not write invalid prose or throw when storage is unavailable", () => {
    const store = storage();
    writeCachedNote("a1b2c3d4", "Start with 2 items.", store);
    assert.equal(readCachedNote("a1b2c3d4", store), null);

    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    assert.equal(readCachedNote("a1b2c3d4", throwing), null);
    assert.doesNotThrow(() =>
      writeCachedNote("a1b2c3d4", "Start with the review.", throwing),
    );
  });

  it("recognises only the three budgets", () => {
    assert.equal(isCoachMinutesValue(15), true);
    assert.equal(isCoachMinutesValue(30), true);
    assert.equal(isCoachMinutesValue(60), true);
    assert.equal(isCoachMinutesValue(45), false);
    assert.equal(isCoachMinutesValue("30"), false);
  });
});

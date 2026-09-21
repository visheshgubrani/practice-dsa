"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * localStorage-backed state that is safe to server-render and safe to re-key.
 *
 * In the workspace this is a recovery copy for unsaved edits, not the durable
 * store — drafts and notes are written to Postgres after load. The problem
 * list still reads `dsa.progress` from here until Submit persistence lands.
 *
 * The value lives in a tiny external store per storage key and is read with
 * `useSyncExternalStore`, which is what keeps the server render deterministic
 * (the fallback) while the client render picks up whatever is on disk — without
 * a hydration mismatch and without a setState-inside-an-effect round trip.
 *
 * `initialValue` must be referentially stable (a constant, a module value, or a
 * primitive): it is part of the snapshot cache key.
 *
 * Storage access is always guarded — private mode, disabled storage and quota
 * errors all degrade to in-memory state.
 */

type Snapshot<T> = { value: T; hydrated: boolean };

type KeyStore<T> = {
  read: (fallback: T) => Snapshot<T>;
  readServer: (fallback: T) => Snapshot<T>;
  write: (value: T) => void;
  subscribe: (onChange: () => void) => () => void;
};

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parse<T>(raw: string | null): { found: boolean; value?: T } {
  if (raw === null) return { found: false };
  try {
    return { found: true, value: JSON.parse(raw) as T };
  } catch {
    return { found: false };
  }
}

function createKeyStore<T>(key: string): KeyStore<T> {
  const listeners = new Set<() => void>();

  let cached: Snapshot<T> | null = null;
  let cachedRaw: string | null = null;
  let cachedFallback: T | null = null;
  let cachedFromStorage = false;

  let serverCached: Snapshot<T> | null = null;
  let serverFallback: T | null = null;

  return {
    read(fallback) {
      const raw = readRaw(key);
      const stored = parse<T>(raw);
      const fromStorage = stored.found;

      if (
        cached !== null &&
        cachedRaw === raw &&
        cachedFromStorage === fromStorage &&
        (fromStorage || Object.is(cachedFallback, fallback))
      ) {
        return cached;
      }

      cachedRaw = raw;
      cachedFallback = fallback;
      cachedFromStorage = fromStorage;
      cached = {
        value: fromStorage ? (stored.value as T) : fallback,
        hydrated: true,
      };
      return cached;
    },

    readServer(fallback) {
      if (serverCached !== null && Object.is(serverFallback, fallback)) {
        return serverCached;
      }
      serverFallback = fallback;
      serverCached = { value: fallback, hydrated: false };
      return serverCached;
    },

    write(value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Storage unavailable or full: keep the in-memory value only.
      }
      cached = { value, hydrated: true };
      cachedRaw = readRaw(key);
      cachedFallback = value;
      cachedFromStorage = true;
      for (const listener of listeners) listener();
    },

    subscribe(onChange) {
      listeners.add(onChange);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) onChange();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
}

const stores = new Map<string, KeyStore<never>>();

function getStore<T>(key: string): KeyStore<T> {
  const existing = stores.get(key);
  if (existing) return existing as unknown as KeyStore<T>;
  const created = createKeyStore<T>(key) as unknown as KeyStore<never>;
  stores.set(key, created);
  return created as unknown as KeyStore<T>;
}

export function usePersistedState<T>(key: string, initialValue: T) {
  const store = useMemo(() => getStore<T>(key), [key]);

  const subscribe = useCallback(
    (onChange: () => void) => store.subscribe(onChange),
    [store],
  );

  const getSnapshot = useCallback(
    () => store.read(initialValue),
    [initialValue, store],
  );

  const getServerSnapshot = useCallback(
    () => store.readServer(initialValue),
    [initialValue, store],
  );

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      const current = store.read(initialValue).value;
      const resolved =
        typeof next === "function" ? (next as (value: T) => T)(current) : next;
      store.write(resolved);
    },
    [initialValue, store],
  );

  const reset = useCallback(() => {
    store.write(initialValue);
  }, [initialValue, store]);

  return {
    value: snapshot.value,
    setValue,
    /** False on the server and during hydration, true once storage was read. */
    hydrated: snapshot.hydrated,
    reset,
  };
}

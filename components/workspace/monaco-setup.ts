"use client";

import { loader } from "@monaco-editor/react";

/**
 * Monaco is served as the AMD build from `public/monaco/vs`, copied out of the
 * installed `monaco-editor` package by `scripts/sync-monaco.mjs`. That keeps
 * the editor offline-capable, version-pinned, and free of bundler plugins
 * (Turbopack is the Next 16 default and has no Monaco plugin).
 *
 * Override with NEXT_PUBLIC_MONACO_VS_URL if the copy is ever missing — a CDN
 * of the same version is a drop-in replacement.
 */
let configured = false;

export const MONACO_VS_PATH =
  process.env.NEXT_PUBLIC_MONACO_VS_URL ?? "/monaco/vs";

export function ensureMonacoLoader() {
  if (configured) return;
  loader.config({ paths: { vs: MONACO_VS_PATH } });
  configured = true;
}

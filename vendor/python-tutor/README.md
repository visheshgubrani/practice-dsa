# Python Tutor (vendored)

The tracer and the picture behind the workspace's **Visualize** tab. Everything
here is third-party code, kept verbatim, and served offline.

**Upstream:** Online Python Tutor — <https://github.com/pgbovine/OnlinePythonTutor/>
**Copyright:** Philip J. Guo — MIT. See `LICENSE` in this directory.
**Source used:** `GraceDuquiza/OnlinePythonTutor-Py3` @ `d5de0c3f1766d2e86818da159435f664951f5261`
(<https://github.com/GraceDuquiza/OnlinePythonTutor-Py3>), a mirror of the
upstream `v5-unity` tree updated for current CPython.

## Why not the original repository

`pgbovine/OnlinePythonTutor` no longer resolves on GitHub (404 as of
2026), and the last mirror snapshot (`zetaloop/OnlinePythonTutor-Backup`,
2023) cannot run on the Python this app judges with: `pg_logger.py` line 34 does
`import imp`, and **`imp` was removed in Python 3.12**. The source above is the
same MIT logger with that one import replaced by `importlib.util`, plus two raw
string regex fixes. Nothing else about the trace format, the encoder, or the
frontend differs — `pg_encoder.py` is byte-identical to the 2023 snapshot.

## The four upstream files

| File | sha256 | Notes |
| --- | --- | --- |
| `pg_logger.py` | `356f64c62f497e764cb2d8f99d7cc2529e75e871945630d830dba9829776dfe8` | the tracer: a `bdb.Bdb` subclass that snapshots the stack and heap per line |
| `pg_encoder.py` | `f8686daa1c0fc2d912495c39cda7529cbcb9a89efdf15bd777d4b298a6e0bba3` | turns live objects into the JSON heap the frontend draws |
| `pytutor-embed.bundle.js` | `627d4d7915846520c0cf12b06458853bf714b1b3813382b45d14d8f2060182c3` | webpack build of `js/pytutor.ts` + d3 v2 + jQuery 3. Exposes `window.addVisualizerToPage(trace, divId, params)` |
| `pytutor.css` | `563d2f8a1084c5d6f2aaa03b07f779cadcc4935c71540d8961ddc48dda75b455` | the visualizer's own stylesheet (light theme) |

`pytutor-embed.bundle.js` is a **prebuilt** artifact from that tree's `build/`
directory; we do not run Python Tutor's TypeScript/webpack build. It loads no
CDN resources, so the tab works offline.

## What is ours, not upstream

- `frame.html` — the same-origin iframe page: loads the two browser assets,
  waits for a trace over `postMessage`, and calls `addVisualizerToPage`.
- `VERSION` — the stamp `scripts/sync-visualizer.mjs` compares before copying.
- This README.

## How it is used

`pnpm dev` and `pnpm build` run `scripts/sync-visualizer.mjs`, which copies
**only the browser assets** (`pytutor-embed.bundle.js`, `pytutor.css`,
`frame.html`) into `public/vendor/python-tutor/`. The Visualize tab frames
`frame.html`, which loads the other two.

The API reads `pg_logger.py` and `pg_encoder.py` straight out of this directory
at request time and sends them to Piston beside its own driver — the committed
copy is the one that runs, and the tracer never enters the generated `public/`
tree.

Do not edit the four upstream files. Re-vendoring means replacing them wholesale
and updating the hashes above plus `VERSION`.

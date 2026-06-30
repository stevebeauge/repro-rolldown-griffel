# repro-rolldown-griffel

Minimal reproduction of a **Rolldown linking error** (`[MISSING_EXPORT] "RESET"`)
that occurs on a production `vite build` with **Vite 8** (which bundles Rolldown)
+ `@vitejs/plugin-react@6`, when the app uses `@fluentui/react-components`
(→ `@griffel/react` → `@griffel/core`).

The **same project** builds fine with **Vite 7** (Rollup/esbuild) + `@vitejs/plugin-react@5`.

## Reproduce

```bash
npm install
npm run build      # i.e. `vite build`
```

### Expected error (Vite 8 — FAILS)

```
error during build:
Build failed with 1 error:

[MISSING_EXPORT] "RESET" is not exported by "node_modules/@griffel/core/src/index.js".
   ╭─[ node_modules/@griffel/react/src/index.js:2:10 ]
   │
 2 │ export { RESET, shorthands, mergeClasses, createDOMRenderer } from '@griffel/core';
   │          ──┬──
   │            ╰──── Missing export
───╯
```

## The export chain at fault

```js
// @fluentui/react-components barrel  ->  @griffel/react/src/index.js
export { RESET, shorthands, mergeClasses, createDOMRenderer } from '@griffel/core';

// @griffel/core/src/index.js  — RESET is NOT a named export here:
export * from './constants.js';   // RESET only reaches the barrel via this `export *`

// @griffel/core/src/constants.js
export const RESET = '...';
```

Rollup/esbuild (Vite 7) resolve `RESET` through the re-exported `export *`.
**Rolldown 1.1.3 (Vite 8) fails to resolve it** and reports it as a missing export
at **link time** (not tree-shaking — see below).

## Vite 7 vs Vite 8 contrast

| Stack                                   | Bundler            | `vite build` |
|-----------------------------------------|--------------------|--------------|
| `vite@8` + `@vitejs/plugin-react@6`     | **Rolldown 1.1.3** | **FAILS** (MISSING_EXPORT) |
| `vite@7` + `@vitejs/plugin-react@5`     | Rollup + esbuild   | OK           |

Exact commands to replay the contrast (on a copy, so the pinned Vite 8 lockfile stays intact):

```bash
# FAILS (default state of this repo)
npm install
npm run build

# OK — Vite 7
npm install -D vite@^7 @vitejs/plugin-react@^5
npm run build
# (then restore: npm install -D vite@^8 @vitejs/plugin-react@^6)
```

## Trigger threshold (important)

This is a **linking error hidden by tree-shaking**, not a tree-shaking bug.
The precise condition: **a retained reference to `RESET` must survive in the module
graph** (directly, or transitively via a Fluent component).

| Input case                                                           | Result |
|----------------------------------------------------------------------|--------|
| `import { RESET } from '@fluentui/react-components'` **unused**       | OK (tree-shaken → the re-export disappears) |
| `import { RESET } ...` **+ a use** (`console.log(RESET)`)            | **FAILS** |
| Any rendered Fluent component (`<Title1/>`, `<Text/>`)               | **FAILS** (retains `RESET` transitively) |
| `makeStyles` / `tokens` alone (used)                                 | OK     |
| `FluentProvider` + `webLightTheme` alone                             | OK     |
| Realistic profile (this repo: `makeStyles` + `tokens` + `Title1` + `Text` under `FluentProvider`) | **FAILS** |

Proof it's **linking** and not tree-shaking: on a failing case, adding
`build.rollupOptions.treeshake = false` **does not help** (still `MISSING_EXPORT "RESET"`).

This is also why a "naive" repro (importing the barrel without a retained use of `RESET`)
**does not** trigger the bug: the `export { RESET, ... } from '@griffel/core'` line is
eliminated before linking. As soon as a real use retains it (a Fluent component, or
`RESET` explicitly consumed), Rolldown tries to link it and fails.

## Workaround

`build.rollupOptions.shimMissingExports: true` makes the build pass; the output is
byte-identical to rewriting the barrel as an explicit
`export { RESET, ... } from './constants.js'` (since `RESET` is unused at runtime
through this path and gets tree-shaken anyway).

## Pinned versions (see `package-lock.json`)

- `vite` **8.1.1**  (→ `rolldown` **1.1.3** transitively)
- `@vitejs/plugin-react` **6.0.3**
- `react` / `react-dom` **19.2.7**
- `@fluentui/react-components` **9.74.3**
- `@griffel/react` **1.7.4**
- `@griffel/core` **1.21.2**

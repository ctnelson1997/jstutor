# CLAUDE.md — Project Instructions for JSTutor

## What This Is

JSTutor is a **client-side-only** React app that visualizes JavaScript execution step-by-step. Students write JS snippets in a CodeMirror editor and see call stack, variables, heap objects, and console output at every line. No backend — everything runs in the browser.

The architecture is designed for **multi-language support**: the JS engine is behind a `LanguageEngine` interface so additional languages (Python, TypeScript, etc.) can be plugged in by adding an engine under `src/engines/`.

## Commands

```bash
npm run dev        # Vite dev server (localhost:3000)
npm run build      # tsc -b && vite build (outputs to docs/)
npm run test       # vitest run (125 tests, ~3.5s)
npm test:watch     # vitest in watch mode
npm run lint       # ESLint
```

## Architecture

```
User code
  -> LanguageEngine.execute(source)
    -> Instrumenter (Acorn AST transform)
    -> Runtime preamble + instrumented code
    -> Disposable Web Worker (blob URL)
    -> ExecutionSnapshot[]
  -> Zustand store
  -> React UI
```

### Engine Layer (`src/engines/`)

Each language is a `LanguageEngine` (defined in `src/types/engine.ts`):

```
src/engines/
  registry.ts              # getEngine(), getEngineSync(), SUPPORTED_LANGUAGES, isLanguageId()
  js/
    index.ts               # jsEngine: LanguageEngine
    instrumenter.ts        # Acorn AST transform (938 lines, the core engine)
    runtime.ts             # getRuntimeCode() — JS string prepended to instrumented code
    executor.ts            # execute(source) -> Promise<WorkerMessage> (no store coupling)
    examples.ts            # 11 JS examples with language:'js' field
    security.ts            # analyzeCode() — regex-based suspicious pattern detection
```

The **dispatcher** at `src/engine/executor.ts` is a thin layer that reads `language` from the store, calls `getEngine(language)`, delegates to `engine.execute()`, and updates the store. All UI components import `runCode` from here.

### Adding a New Language

1. Create `src/engines/<lang>/` with an `index.ts` exporting a `LanguageEngine` object
2. Add one line to `src/engines/registry.ts`
3. Expand `LanguageId` type in `src/types/engine.ts`
4. The language selector dropdown in AppNavbar automatically appears when 2+ engines exist

### Store (`src/store/useStore.ts`)

Zustand store with: `language`, `code`, `snapshots`, `currentStep`, `isRunning`, `error`, `hideFunctions`. The `language` field drives which engine is used and which editor extension / examples / sandbox code are shown.

### Routing (`src/main.tsx`)

HashRouter with language-parameterized routes:

```
/                           Main editor
/examples/:slug             JS example (legacy compat)
/examples/:lang/:slug       Language-specific example
/share/:encoded             Shared code (legacy, defaults to JS)
/share/:lang/:encoded       Language-specific shared code
/embed/:encoded             Embed (legacy)
/embed/:lang/:encoded       Language-specific embed
```

Share URLs include the language in the path: `#/share/js/v1~<compressed>`.

## TypeScript Constraints

- **`erasableSyntaxOnly: true`** — No `enum`, no parameter properties (`constructor(readonly x)`), no `namespace`. Use `type` unions and plain class fields instead.
- **`verbatimModuleSyntax: true`** — Use `import type` for type-only imports.
- **`noUnusedLocals` / `noUnusedParameters`** — Prefix unused params with `_` if needed.
- Test files (`__tests__/`) are excluded from `tsconfig.app.json` via the `exclude` array — they use Node APIs (`node:vm`) that aren't in the app's type scope.

## Testing

**Framework**: Vitest 4.x (reads `vite.config.ts` automatically, no separate config needed).

**Test suites** (125 tests total):

| Suite | Location | What it tests |
|---|---|---|
| Instrumenter | `src/engine/__tests__/instrumenter.test.ts` | `instrument()` output: capture injection, loop guards, condition wrapping, destructuring, closures, classes, all examples |
| Pipeline | `src/engine/__tests__/pipeline.test.ts` | Full instrument -> runtime -> eval -> snapshots pipeline using `node:vm` sandboxed contexts |
| diffSnapshots | `src/utils/__tests__/diffSnapshots.test.ts` | `getChangedKeys()`: variable changes, heap property changes, closure vars, this context |
| Share | `src/utils/__tests__/share.test.ts` | `encodeShareCode`/`decodeShareCode` round-trips + `analyzeCode` suspicious pattern detection |
| Store | `src/store/__tests__/useStore.test.ts` | Zustand actions: step navigation, clamping, reset, error handling |

**Important: `fileParallelism: false`** is set in `vite.config.ts`. The `@vitejs/plugin-react` Babel initialization races across parallel worker threads on Windows, causing intermittent "Cannot read properties of undefined (reading 'config')" failures. Do not remove this setting.

Pipeline tests use `node:vm` (`createContext` + `runInContext`) instead of `eval` because Vitest's ESM transform strips the `eval` identifier. Each pipeline test gets a fresh sandboxed context with needed builtins (Map, Set, Array, Date, etc.) so there's no global state leakage between tests.

## Key Design Notes

- **Native JS in Web Worker** (not QuickJS/WASM) for full Web API support
- **Disposable blob-URL workers** per execution — fresh global scope each run
- **TDZ-aware instrumentation** — `let`/`const` tracked incrementally; `var`/`function` hoisted
- **Block scopes** — Loops with `let`/`const` use `isBlockScope` flag, rendered nested inside parent frame
- **Condition tracking** — `__condition__()` wraps if/else-if tests, emits snapshots with `condition` field
- **Value change animation** — `diffSnapshots.ts` compares consecutive snapshots, applies `value-changed` CSS class
- **Snapshot limit**: 5000 per execution, worker killed after 10 seconds
- **Security**: shared links show warning interstitial, `eval` blocked, static analysis flags suspicious APIs
- **`HeapObjectType`** is an open string union — engines can emit custom types (e.g. Python's `dict`, `tuple`)
- **JS engine eagerly loaded** at startup in `main.tsx` so `getEngineSync('js')` is always available
- `acorn-walk` is an unused legacy dependency — can be removed

## Deployment

GitHub Pages from the `docs/` folder. The Vite build outputs there (`build.outDir: 'docs'`).

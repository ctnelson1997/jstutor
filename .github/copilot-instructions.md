# JSTutor — Copilot Project Instructions

## Overview

**JSTutor** is a client-side-only React web application. It lets students write small JavaScript snippets in an editor and visualize how they execute step-by-step, showing the call stack, variable bindings, heap objects, and console output at every line. There is **no backend**—all parsing, instrumentation, and execution happen in the browser.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Build tool | Vite | 7.3.x |
| UI framework | React | 19.x |
| Language | TypeScript | 5.9.x |
| Component library | React-Bootstrap + Bootstrap | 2.10 / 5.3 |
| Code editor | @uiw/react-codemirror + @codemirror/lang-javascript | 4.x / 6.x |
| AST parsing | acorn | 8.x |
| Code generation | astring | 1.x |
| State management | zustand | 5.x |
| Routing | react-router-dom (HashRouter) | 7.x |
| URL compression | lz-string | 1.5 |

Dev server runs on **http://localhost:3000** (configured in `vite.config.ts`, default Vite).

---

## Architecture

```
User code  →  Instrumenter (AST transform)  →  Runtime preamble + instrumented code
     ↓
Web Worker (Blob URL, disposable)  →  __snapshots__[]
     ↓
Zustand store  →  React UI (editor + visualization)
```

### Multi-Language Engine System (src/engines/)

The app uses a **pluggable engine architecture** designed for multi-language support. Each language implements the `LanguageEngine` interface (defined in `src/types/engine.ts`) and is registered in `src/engines/registry.ts`.

#### Engine Interface (`src/types/engine.ts`)
Each engine provides: `id`, `displayName`, `editorExtension()` (CodeMirror language), `execute(source)` (returns `Promise<WorkerMessage>`), `examples`, `sandboxCode`, optional `analyzeCode()`, and optional `heapTypeConfig` for custom heap type display.

#### Engine Registry (`src/engines/registry.ts`)
- `getEngine(id)` — async, lazy-loads engine on first call
- `getEngineSync(id)` — returns cached engine or undefined
- `SUPPORTED_LANGUAGES` — array of registered language IDs
- `isLanguageId(value)` — type guard for URL param validation

#### Dispatcher (`src/engine/executor.ts`)
- `runCode(source)` reads `language` from the Zustand store, gets the engine via the registry, calls `engine.execute()`, and updates the store. All UI components import `runCode` from here.

#### JavaScript Engine (`src/engines/js/`)

Uses **native JavaScript execution inside a disposable Web Worker** (not QuickJS/WASM). A fresh worker is created for each run via `URL.createObjectURL(new Blob([...]))`.

**instrumenter.ts** — Parses user code with **Acorn** and injects:
  - `__capture__(line, { ...vars })` after each statement
  - `__pushFrame__(name, { ...params })` / `__popFrame__()` at function entry/exit
  - `__condition__()` around if/else-if/loop test expressions
  - Loop guards: `if (++__loopCount > __MAX_LOOPS) throw ...`
  - Blocks `eval` by reassigning it to `undefined`
- **TDZ-aware**: Tracks `declaredSoFar` incrementally.

**runtime.ts** — `getRuntimeCode()` returns a self-contained JS string prepended to instrumented code. Implements serialization, heap tracking, call stack management, and console capture.

**executor.ts** — Pure `execute(source): Promise<WorkerMessage>` with no store coupling. Handles instrumentation, worker creation, and 10-second timeout.

**examples.ts** — 11 built-in JS examples with `language: 'js'` field.

**security.ts** — `analyzeCode()` regex-based suspicious API detection.

#### Adding a New Language
1. Create `src/engines/<lang>/` implementing `LanguageEngine`
2. Add one line to `src/engines/registry.ts`
3. Expand `LanguageId` in `src/types/engine.ts`
4. The language selector in AppNavbar appears automatically when 2+ engines exist

---

## Data Model (src/types/snapshot.ts)

```typescript
ExecutionSnapshot {
  step: number;
  line: number;
  callStack: StackFrame[];
  heap: HeapObject[];
  stdout: string[];
}

StackFrame { name: string; variables: Variable[]; }
Variable { name: string; value: RuntimeValue; }
RuntimeValue = PrimitiveValue | HeapRef
PrimitiveValue { type: 'number'|'string'|'boolean'|'null'|'undefined'|'symbol'|'bigint'; value: ... }
HeapRef { type: 'ref'; heapId: string; }
HeapObject { id: string; objectType: HeapObjectType; label?: string; properties: Property[]; }
```

---

## State Management (src/store/useStore.ts)

Zustand store with flat structure:

| Field | Type | Purpose |
|---|---|---|
| `language` | `LanguageId` | Active language engine ('js') |
| `code` | `string` | Current editor content |
| `snapshots` | `ExecutionSnapshot[]` | All captured steps |
| `currentStep` | `number` | Active step index |
| `isRunning` | `boolean` | Execution in progress |
| `error` | `{ message, line? } \| null` | Last error |

Actions: `setLanguage`, `setCode`, `setSnapshots`, `setCurrentStep`, `stepForward`, `stepBackward`, `stepFirst`, `stepLast`, `setIsRunning`, `setError`, `reset`.

---

## UI Components (src/components/)

### App.tsx
- Top-level layout: Navbar + two-column `Container fluid`.
- Left column (lg=5): `EditorPanel`. Right column (lg=7): `VisualizationPanel`.
- Keyboard shortcuts: Arrow keys for stepping, Shift+Enter to run.

### AppNavbar.tsx
- Bootstrap Navbar with "JSTutor" brand.
- Examples dropdown organized by category (Basics, Functions, Data Structures, Objects & Classes, Async).
- Share button: generates a `#/share/:encoded` URL using lz-string compression and copies to clipboard.

### EditorPanel.tsx
- CodeMirror 6 editor with JavaScript syntax highlighting.
- Line highlighting for the current step using CodeMirror's `StateField` + `Decoration` API.
- "Visualize Execution" button and error display (Alert banner).

### ControlBar.tsx
- Step navigation buttons: ⏮ First, ◀ Back, ▶ Forward, ⏭ Last.
- Range slider scrubber for quick navigation.
- Step counter display ("Step X of Y — Line Z").

### VisualizationPanel.tsx
- Composes: `ControlBar` + `FramesView` + `HeapView` + `ConsolePanel`.
- Shows a placeholder message when no snapshots exist.

### FramesView.tsx
- Renders the call stack as vertically stacked Bootstrap Cards.
- Each frame shows variable names with color-coded typed values.
- Heap references shown as colored dots that conceptually point to the heap panel.

### HeapView.tsx
- Renders heap objects: arrays as horizontal indexed cells, objects/classes as key-value tables, functions as badges.
- Objects are labeled with their constructor name when applicable.

### ConsolePanel.tsx
- Dark terminal-style panel showing `stdout` entries up to the current step.

---

## Pages (src/pages/)

### ShareWarningPage.tsx
- Warning interstitial displayed when opening a shared link (`#/share/:encoded`).
- Decodes lz-string code, shows read-only preview, runs static analysis flags.
- "View & Run" loads the code into the editor; "Cancel" returns to home.

---

## Utilities (src/utils/)

### share.ts
- `encodeShareCode(code)` / `decodeShareCode(encoded)` — lz-string URL compression with versioned format (`v1~<compressed>`).

### diffSnapshots.ts
- `getChangedKeys(prev, curr)` — compares consecutive snapshots, returns `Set<string>` of changed value keys (used for yellow flash animation).

Note: `analyzeCode()` and examples have moved to `src/engines/js/security.ts` and `src/engines/js/examples.ts` respectively.

---

## Routing

Uses `HashRouter` (client-side only, no server config needed):

| Route | Component | Purpose |
|---|---|---|
| `/` | `App` | Main editor + visualization |
| `/examples/:slug` | `ExamplePage` | Load example (defaults to JS) |
| `/examples/:lang/:slug` | `ExamplePage` | Language-specific example |
| `/share/:encoded` | `ShareWarningPage` | Shared code (defaults to JS) |
| `/share/:lang/:encoded` | `ShareWarningPage` | Language-specific shared code |
| `/embed/:encoded` | `EmbedPage` | Embed mode (defaults to JS) |
| `/embed/:lang/:encoded` | `EmbedPage` | Language-specific embed |

---

## Key Design Decisions

1. **Native JS in Web Worker** (not QuickJS/WASM): Chosen for full Web API support in educational contexts. Students can use `setTimeout`, `Promise`, `Map`, `Set`, etc. without compatibility gaps.
2. **Disposable blob-URL workers**: Each execution creates a fresh worker to prevent state leakage between runs.
3. **TDZ-aware instrumentation**: The instrumenter tracks variables incrementally. Only hoisted declarations (`var`, `function`) are captured from the start of a block; `let`/`const` are added after their declaration line.
4. **Security model**: Shared links display a warning interstitial with static analysis before execution. `eval()` is blocked in instrumented code.
5. **No server**: Everything runs client-side. Sharing uses URL hash fragments with lz-string compression.

---

## File Structure

```
jstutor/
├── index.html
├── package.json
├── vite.config.ts                   # Vite + Vitest config (fileParallelism: false)
├── CLAUDE.md                        # Claude Code project instructions
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── eslint.config.js
├── public/
├── src/
│   ├── main.tsx                     # Entry: HashRouter + routes + eager engine load
│   ├── App.tsx                      # Main layout + keyboard shortcuts
│   ├── index.css                    # All custom styles
│   ├── engines/                     # Pluggable language engine system
│   │   ├── registry.ts             # Engine registry (lazy loading)
│   │   └── js/                     # JavaScript engine
│   │       ├── index.ts            # LanguageEngine implementation
│   │       ├── instrumenter.ts     # Acorn AST transform (core engine)
│   │       ├── runtime.ts          # Worker runtime preamble (JS string)
│   │       ├── executor.ts         # instrument → worker → snapshots
│   │       ├── examples.ts         # 11 JS example snippets
│   │       └── security.ts         # Suspicious code pattern detection
│   ├── engine/
│   │   └── executor.ts             # Thin dispatcher: store → engine → store
│   ├── components/
│   │   ├── AppNavbar.tsx           # Navbar + examples + language selector
│   │   ├── EditorPanel.tsx         # CodeMirror editor + line highlight
│   │   ├── ControlBar.tsx          # Step controls + share/embed
│   │   ├── VisualizationPanel.tsx  # Frames + heap + console composition
│   │   ├── FramesView.tsx          # Call stack variable cards
│   │   ├── HeapView.tsx            # Heap object visualization
│   │   ├── PointerArrows.tsx       # SVG reference arrows
│   │   └── ConsolePanel.tsx        # Terminal-style output
│   ├── pages/
│   │   ├── ShareWarningPage.tsx    # Shared-link warning interstitial
│   │   ├── EmbedPage.tsx           # Iframe embed mode
│   │   └── ExamplePage.tsx         # Load example by slug
│   ├── store/
│   │   └── useStore.ts             # Zustand store
│   ├── types/
│   │   ├── snapshot.ts             # ExecutionSnapshot, StackFrame, HeapObject, etc.
│   │   └── engine.ts               # LanguageEngine interface, LanguageId
│   └── utils/
│       ├── share.ts                # lz-string URL encoding
│       └── diffSnapshots.ts        # Snapshot change detection
└── .github/
    └── copilot-instructions.md     # This file
```

---

## Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:3000)
npm run build        # Type-check + production build (outputs to docs/)
npm run test         # Run Vitest (125 tests)
npm run lint         # ESLint
npm run preview      # Preview production build
```

---

## Known Considerations

- **acorn-walk is installed but unused**: The instrumenter uses manual AST traversal. Can be removed.
- **Infinite loop protection**: Loops are guarded with a counter that throws after 10,000 iterations. Workers killed after 10 seconds.
- **Snapshot limit**: The runtime caps at 5,000 snapshots per execution.
- **Async code**: Visualization is synchronous capture-based. Async code executes but microtask boundaries don't produce intermediate captures.
- **TypeScript constraints**: `erasableSyntaxOnly: true` (no enums, no parameter properties), `verbatimModuleSyntax: true`.
- **Testing**: `fileParallelism: false` is required in `vite.config.ts` — the `@vitejs/plugin-react` Babel initialization races across parallel worker threads on Windows. Do not remove this setting.
- **HeapObjectType**: Open string union — language engines can emit custom types beyond the JS built-ins.
- **Multi-language ready**: The `LanguageEngine` interface, engine registry, language-aware routing, and language selector UI are all in place. Adding a second language requires only engine implementation + one registry line.

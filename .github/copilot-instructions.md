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

### Execution Engine (src/engine/)

The engine uses **native JavaScript execution inside a disposable Web Worker** (not QuickJS/WASM). A fresh worker is created for each run via `URL.createObjectURL(new Blob([...]))` to guarantee a clean global scope. Workers are terminated after 10 seconds as a safety net.

#### instrumenter.ts
- Parses user code with **Acorn** (`ecmaVersion: 'latest'`, `sourceType: 'script'`, `locations: true`).
- Walks the AST and injects capture/frame calls:
  - `__capture__(line, { ...vars })` after each statement to snapshot variable state.
  - `__pushFrame__(name, { ...params })` at function entry.
  - `__popFrame__()` at function exit (and before every `return`).
  - Loop guards: `if (++__loopCount > __MAX_LOOPS) throw ...` at the top of every loop body.
  - `eval` is blocked by reassigning it to `undefined`.
- **TDZ-aware**: Tracks `declaredSoFar` incrementally. Only `var`/`function` (hoisted) names are captured from the start of a block; `let`/`const` names are added *after* their declaration statement is processed. This prevents "Cannot access before initialization" errors.
- Key functions: `instrument()` (entry point), `instrumentBlock()`, `instrumentFunction()`, `instrumentStatement()`, `instrumentExpression()`, `instrumentLoop()`, `instrumentClass()`, `collectHoistedNames()`, `collectDeclaredNamesFromStmt()`.

#### runtime.ts
- `getRuntimeCode()` returns a self-contained JS string (no imports) that is **prepended** to the instrumented code inside the worker.
- Implements `__capture__()`, `__pushFrame__()`, `__popFrame__()`, `__logOutput__()`.
- Deep serialization via `__serializeValue__()` and `__serializeHeapObject__()` with a `Map`-based identity tracker (`__heapMap__`) to assign stable heap IDs.
- Console overrides: `console.log/warn/error/info` are patched to call `__logOutput__()`.
- Exposes `self.__snapshots__` for the worker host to read after execution.

#### executor.ts
- `runCode(source)` orchestrates the full pipeline: instrument → prepend runtime → execute in worker → update store.
- `createWorker()` creates a blob-URL worker that does an indirect `eval` on received code.
- `executeInWorker(code)` wraps execution in a `Promise` with a 10-second timeout and `worker.terminate()` fallback.

#### worker.ts
- Static worker template file (currently unused — `executor.ts` generates workers dynamically via blob URLs).

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
| `code` | `string` | Current editor content |
| `snapshots` | `ExecutionSnapshot[]` | All captured steps |
| `currentStep` | `number` | Active step index |
| `isRunning` | `boolean` | Execution in progress |
| `error` | `{ message, line? } \| null` | Last error |

Actions: `setCode`, `setSnapshots`, `setCurrentStep`, `stepForward`, `stepBackward`, `stepFirst`, `stepLast`, `setIsRunning`, `setError`, `reset`.

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
- `encodeShareCode(code)` / `decodeShareCode(encoded)` — lz-string URL compression.
- `analyzeCode(code)` — regex-based static analysis that flags suspicious API usage (fetch, WebSocket, eval, localStorage, location, etc.).

### examples.ts
- 12 pre-built example snippets across 5 categories:
  - **Basics**: Variables & Types, Loops, Conditionals
  - **Functions**: Recursion (Fibonacci), Closures, Higher-Order Functions
  - **Data Structures**: Arrays, Linked List
  - **Objects & Classes**: Object Literals, Classes & Inheritance
  - **Async**: Promises, Async/Await

---

## Routing

Uses `HashRouter` (client-side only, no server config needed):

| Route | Component | Purpose |
|---|---|---|
| `/` | `App` | Main editor + visualization |
| `/share/:encoded` | `ShareWarningPage` | Warning interstitial for shared code |

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
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── eslint.config.js
├── public/
├── src/
│   ├── main.tsx                    # Entry: HashRouter + routes
│   ├── App.tsx                     # Main layout + keyboard shortcuts
│   ├── index.css                   # All custom styles
│   ├── components/
│   │   ├── AppNavbar.tsx           # Navbar + examples + share
│   │   ├── EditorPanel.tsx         # CodeMirror editor + line highlight
│   │   ├── ControlBar.tsx          # Step controls + slider
│   │   ├── VisualizationPanel.tsx  # Frames + heap + console composition
│   │   ├── FramesView.tsx          # Call stack variable cards
│   │   ├── HeapView.tsx            # Heap object visualization
│   │   └── ConsolePanel.tsx        # Terminal-style output
│   ├── engine/
│   │   ├── instrumenter.ts         # Acorn AST transform (core engine)
│   │   ├── runtime.ts              # Worker runtime preamble (JS string)
│   │   ├── executor.ts             # Orchestrator: instrument → worker → store
│   │   └── worker.ts               # Static worker template (unused)
│   ├── pages/
│   │   └── ShareWarningPage.tsx    # Shared-link warning interstitial
│   ├── store/
│   │   └── useStore.ts             # Zustand store
│   ├── types/
│   │   └── snapshot.ts             # TypeScript data model
│   └── utils/
│       ├── examples.ts             # 12 example snippets
│       └── share.ts                # lz-string encoding + code analysis
└── .github/
    └── copilot-instructions.md     # This file
```

---

## Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:3000)
npm run build        # Type-check + production build
npm run preview      # Preview production build
npm run lint         # ESLint
```

---

## Known Considerations

- **worker.ts is unused**: The executor creates workers dynamically via blob URLs. The static `worker.ts` file was part of an earlier design and can be removed.
- **acorn-walk is installed but unused**: Was installed during development but the instrumenter uses manual AST traversal instead. Can be removed from dependencies.
- **Infinite loop protection**: Loops are guarded with a counter that throws after 10,000 iterations. The worker itself is killed after 10 seconds.
- **Snapshot limit**: The runtime caps at 5,000 snapshots per execution to prevent memory issues.
- **Async code**: The examples include Promise/async-await snippets, but the step-by-step visualization is synchronous capture-based. Async code will execute but microtask boundaries won't produce intermediate captures.

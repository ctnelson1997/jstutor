# JSTutor

A free, browser-based JavaScript execution visualizer. Write a snippet of JavaScript, step through it line by line, and watch the call stack, heap, and console update in real time.

**Live site:** [jstutor.org](https://jstutor.org)

---

## What It Does

JSTutor instruments your JavaScript code using an AST transform, runs it inside a sandboxed Web Worker, and captures a snapshot of program state at every step. You can then step forward and backward through execution to see exactly what the runtime is doing at each moment.

At each step the visualizer shows:

- **Call Stack** — active function frames and block scopes with live variable values, closures, and `this` context
- **Heap** — objects, arrays, functions, classes, Maps, Sets, and more displayed as cards with pointer arrows linking references (filterable by all frames / current frame, with an option to hide function objects)
- **Console** — output from `console.log` / `console.warn` / `console.error`
- **Condition badges** — `true`/`false` pills annotated directly in the editor for `if`/`else if` and loop conditions
- **Value change detection** — variables that changed between steps flash yellow so you can spot what just updated
- **Sub-line highlighting** — for-loop init, condition, and update clauses are individually highlighted as they execute
- **Share & embed** — compress your code into a URL to share, or generate an embeddable `<iframe>` snippet (view options like "hide functions" are preserved in the link)

Everything runs in your browser. No server, no account, no data collection.

---

## Architecture

```
User Code (CodeMirror editor)
        │
        ▼
Instrumenter  (src/engine/instrumenter.ts)
  Acorn parses user code into an AST, then rewrites it to inject:
    __pushFrame__ / __popFrame__  — track function call/return + block scopes + closures + this
    __capture__                   — snapshot variables after each statement (with optional column ranges)
    __condition__                 — record if/else-if and loop condition results
    loop guards                   — abort runaway loops after 10,000 iterations
        │
        ▼
Web Worker  (disposable blob URL)
  runtime preamble (src/engine/runtime.ts) + instrumented code
  collects __snapshots__[] as code runs
  killed after 10 s or 5,000 snapshots
        │
        ▼
Zustand store  (src/store/useStore.ts)
  snapshots[], currentStep, code, isRunning, error, hideFunctions
        │
        ▼
React UI  (src/components/)
  EditorPanel  ·  VisualizationPanel  ·  FramesView  ·  HeapView  ·  PointerArrows  ·  ConsolePanel
```

---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
git clone https://github.com/<your-org>/jstutor.git
cd jstutor
npm install
npm run dev          # dev server at http://localhost:3000
```

### Other commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check + build to `docs/` |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |

---

## Project Structure

```
src/
├── engine/
│   ├── instrumenter.ts   # Acorn AST transform — injects runtime hooks
│   ├── executor.ts       # Orchestrator: instrument → worker → store
│   └── runtime.ts        # Worker preamble: __capture__, serialization, heap registry
├── components/
│   ├── AppNavbar.tsx     # Navbar (Sandbox / Examples / About)
│   ├── ControlBar.tsx    # Visualize / step controls / share / embed
│   ├── EditorPanel.tsx   # CodeMirror editor with line/sub-line highlight + condition badges
│   ├── VisualizationPanel.tsx
│   ├── FramesView.tsx    # Recursive call stack + block scopes, closures, this context
│   ├── HeapView.tsx      # Heap object cards with frame filter + hide functions toggle
│   ├── PointerArrows.tsx # SVG overlay drawing reference arrows
│   └── ConsolePanel.tsx  # Captured console output
├── pages/
│   ├── App.tsx               # Main layout (resizable split, keyboard shortcuts)
│   ├── AboutPage.tsx         # About / usage guide
│   ├── ExamplePage.tsx       # Loads a built-in example by slug
│   ├── ShareWarningPage.tsx  # Security interstitial for shared-code links
│   └── EmbedPage.tsx         # Iframe-friendly embed mode
├── store/
│   └── useStore.ts       # Zustand store (code, snapshots, step, view options)
├── types/
│   └── snapshot.ts       # ExecutionSnapshot, StackFrame, HeapObject, ColumnRange, etc.
├── utils/
│   ├── examples.ts       # Built-in example snippets
│   ├── share.ts          # LZ-string URL compression + static code analysis
│   └── diffSnapshots.ts  # Detects changed values between steps (yellow flash)
├── main.tsx              # React entry point + HashRouter routes
└── index.css             # Custom styles (layout, animations, condition badges, scope sections)
```

---

## Key Design Decisions

**Native JS in a Web Worker** — code runs as real JavaScript, not an interpreter, so the full Web API surface is available and execution is fast.

**Disposable blob-URL workers** — a fresh worker is created for each run and terminated afterward; no shared state can leak between executions.

**TDZ-aware instrumentation** — `let`/`const` declarations are tracked incrementally so the visualizer never reads variables before they are initialized.

**Block scopes rendered inline** — `for`, `while`, and `do...while` loop bodies with `let`/`const` appear as nested sections inside their parent frame card rather than as separate call-stack entries.

**Closure & `this` tracking** — when a nested function executes, variables closed over from enclosing scopes are displayed in a dedicated "Closure" section. Method calls show the `this` receiver object.

**Sub-line for-loop highlighting** — for-loop init, condition, and update expressions carry column ranges through the snapshot pipeline, enabling precise sub-expression highlighting in the editor instead of whole-line highlighting.

**URL-based sharing** — the Share button LZ-string-compresses the code into the URL. Shared links open a security interstitial with a read-only code preview and a static analysis scan before execution. View options (like "hide functions") are encoded as query parameters.

---

## Built With

- [React](https://react.dev) 19 + [TypeScript](https://www.typescriptlang.org) 5.9
- [Vite](https://vite.dev) 7 — build tooling, dev server, HMR
- [React Bootstrap](https://react-bootstrap.github.io) / [Bootstrap](https://getbootstrap.com) 5
- [CodeMirror 6](https://codemirror.net) — code editor
- [Acorn](https://github.com/acornjs/acorn) — JavaScript parser (AST instrumentation)
- [Astring](https://github.com/davidbonnet/astring) — JavaScript code generator
- [Zustand](https://zustand.docs.pmnd.rs) — state management
- [React Router](https://reactrouter.com) 7 — client-side routing (HashRouter)
- [lz-string](https://github.com/pieroxy/lz-string) — URL-compressed share links

---

## Deployment

The site is deployed via **GitHub Pages** from the `docs/` folder.

```bash
npm run build      # outputs to docs/
git add docs/
git commit -m "deploy"
git push
```

GitHub Pages serves `docs/` at [jstutor.org](https://jstutor.org) (configured via `docs/CNAME`). HashRouter is used so all routes resolve correctly without server rewrites.

---

## License

MIT — Copyright 2026 [Cole Nelson](https://coletnelson.us), University of Wisconsin–Madison ([cs.wisc.edu](https://cs.wisc.edu)).

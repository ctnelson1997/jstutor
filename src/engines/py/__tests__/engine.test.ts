import { describe, it, expect } from 'vitest';
import { pyEngine } from '../index';
import type { ExecutionSnapshot } from '../../../types/snapshot';

describe('pyEngine', () => {
  // ── Identity ──

  it('has id "py"', () => {
    expect(pyEngine.id).toBe('py');
  });

  it('has displayName "Python"', () => {
    expect(pyEngine.displayName).toBe('Python');
  });

  // ── LanguageEngine contract ──

  it('has a non-empty sandboxCode', () => {
    expect(pyEngine.sandboxCode.length).toBeGreaterThan(0);
  });

  it('editorExtension returns a CodeMirror extension', () => {
    const ext = pyEngine.editorExtension();
    expect(ext).toBeDefined();
  });

  it('execute is a function', () => {
    expect(typeof pyEngine.execute).toBe('function');
  });

  // ── Examples ──

  it('has at least one example', () => {
    expect(pyEngine.examples.length).toBeGreaterThanOrEqual(1);
  });

  it('every example has required fields with language "py"', () => {
    for (const ex of pyEngine.examples) {
      expect(ex.title).toBeTruthy();
      expect(ex.slug).toBeTruthy();
      expect(ex.category).toBeTruthy();
      expect(ex.code).toBeTruthy();
      expect(ex.language).toBe('py');
    }
  });

  it('example slugs are unique', () => {
    const slugs = pyEngine.examples.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('example slugs are URL-safe', () => {
    for (const ex of pyEngine.examples) {
      expect(ex.slug).toMatch(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
    }
  });
});

describe('pyEngine.execute (mock)', () => {
  it('returns a result with snapshots', async () => {
    const result = await pyEngine.execute('x = 1');
    expect(result.type).toBe('result');
    if (result.type === 'result') {
      expect(result.snapshots.length).toBeGreaterThan(0);
    }
  });

  it('snapshots have valid structure', async () => {
    const result = await pyEngine.execute('x = 1');
    if (result.type !== 'result') {
      expect.fail('Expected result type');
      return;
    }

    for (const snap of result.snapshots) {
      // Required fields
      expect(snap).toHaveProperty('step');
      expect(snap).toHaveProperty('line');
      expect(snap).toHaveProperty('callStack');
      expect(snap).toHaveProperty('heap');
      expect(snap).toHaveProperty('stdout');

      expect(typeof snap.step).toBe('number');
      expect(typeof snap.line).toBe('number');
      expect(Array.isArray(snap.callStack)).toBe(true);
      expect(Array.isArray(snap.heap)).toBe(true);
      expect(Array.isArray(snap.stdout)).toBe(true);
    }
  });

  it('snapshots have incrementing step numbers', async () => {
    const result = await pyEngine.execute('x = 1');
    if (result.type !== 'result') {
      expect.fail('Expected result type');
      return;
    }

    for (let i = 0; i < result.snapshots.length; i++) {
      expect(result.snapshots[i].step).toBe(i);
    }
  });

  it('every snapshot has at least one stack frame', async () => {
    const result = await pyEngine.execute('x = 1');
    if (result.type !== 'result') {
      expect.fail('Expected result type');
      return;
    }

    for (const snap of result.snapshots) {
      expect(snap.callStack.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('stack frames have valid variables', async () => {
    const result = await pyEngine.execute('x = 1');
    if (result.type !== 'result') {
      expect.fail('Expected result type');
      return;
    }

    for (const snap of result.snapshots) {
      for (const frame of snap.callStack) {
        expect(frame.name).toBeTruthy();
        expect(Array.isArray(frame.variables)).toBe(true);
        for (const v of frame.variables) {
          expect(v.name).toBeTruthy();
          expect(v.value).toHaveProperty('type');
          expect(v.value).toHaveProperty('value');
        }
      }
    }
  });

  it('stdout entries are strings', async () => {
    const result = await pyEngine.execute('print("hello")');
    if (result.type !== 'result') {
      expect.fail('Expected result type');
      return;
    }

    const lastSnap = result.snapshots[result.snapshots.length - 1];
    for (const entry of lastSnap.stdout) {
      expect(typeof entry).toBe('string');
    }
  });

  it('variables accumulate across snapshots', async () => {
    const result = await pyEngine.execute('x = 1\ny = 2');
    if (result.type !== 'result') {
      expect.fail('Expected result type');
      return;
    }

    const snaps = result.snapshots as ExecutionSnapshot[];
    // Later snapshots should have more (or equal) variables
    const firstVarCount = snaps[0].callStack[0].variables.length;
    const lastVarCount = snaps[snaps.length - 1].callStack[0].variables.length;
    expect(lastVarCount).toBeGreaterThanOrEqual(firstVarCount);
  });
});

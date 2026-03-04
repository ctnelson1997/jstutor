import { create } from 'zustand';
import type { ExecutionSnapshot } from '../types/snapshot';

export interface JSTutorState {
  // ── Editor ──
  code: string;
  setCode: (code: string) => void;

  // ── Execution state ──
  snapshots: ExecutionSnapshot[];
  currentStep: number;
  isRunning: boolean;
  error: { message: string; line?: number } | null;

  // ── Actions ──
  setSnapshots: (snapshots: ExecutionSnapshot[]) => void;
  setCurrentStep: (step: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  stepFirst: () => void;
  stepLast: () => void;
  setIsRunning: (running: boolean) => void;
  setError: (error: { message: string; line?: number } | null) => void;
  reset: () => void;
}

const DEFAULT_CODE = `// Welcome to JSTutor! Write some JavaScript and click "Visualize"
let x = 5;
let y = 10;
let sum = x + y;
console.log(sum);

let arr = [1, 2, 3];
for (let i = 0; i < arr.length; i++) {
  arr[i] = arr[i] * 2;
}
console.log(arr);
`;

export const useStore = create<JSTutorState>((set, get) => ({
  // ── Editor ──
  code: DEFAULT_CODE,
  setCode: (code) => set({ code }),

  // ── Execution state ──
  snapshots: [],
  currentStep: 0,
  isRunning: false,
  error: null,

  // ── Actions ──
  setSnapshots: (snapshots) => set({ snapshots, currentStep: 0, error: null }),

  setCurrentStep: (step) => {
    const { snapshots } = get();
    if (snapshots.length === 0) return;
    const clamped = Math.max(0, Math.min(step, snapshots.length - 1));
    set({ currentStep: clamped });
  },

  stepForward: () => {
    const { currentStep, snapshots } = get();
    if (currentStep < snapshots.length - 1) {
      set({ currentStep: currentStep + 1 });
    }
  },

  stepBackward: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  stepFirst: () => set({ currentStep: 0 }),

  stepLast: () => {
    const { snapshots } = get();
    if (snapshots.length > 0) {
      set({ currentStep: snapshots.length - 1 });
    }
  },

  setIsRunning: (isRunning) => set({ isRunning }),

  setError: (error) => set({ error }),

  reset: () => set({ snapshots: [], currentStep: 0, error: null, isRunning: false }),
}));

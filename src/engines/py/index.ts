import { python } from '@codemirror/lang-python';
import { execute } from './executor';
import { examples } from './examples';
import type { LanguageEngine } from '../../types/engine';

export const pyEngine: LanguageEngine = {
  id: 'py',
  displayName: 'Python',
  editorExtension: () => python(),
  execute,
  examples,
  sandboxCode: '# Write your code below!\nx = 1',
};

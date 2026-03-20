import type { CodeExample } from '../../types/engine';

export const examples: CodeExample[] = [
  {
    title: 'Variables & Types',
    slug: 'variables-types',
    category: 'Basics',
    language: 'py',
    code: `x = 42
name = "hello"
is_valid = True
pi = 3.14
print(x)`,
  },
  {
    title: 'For Loop',
    slug: 'for-loop',
    category: 'Basics',
    language: 'py',
    code: `total = 0
for i in range(5):
    total += i
print(total)`,
  },
  {
    title: 'Lists',
    slug: 'lists',
    category: 'Data Structures',
    language: 'py',
    code: `nums = [1, 2, 3]
nums.append(4)
first = nums[0]
print(nums)`,
  },
];

export interface CodeExample {
  title: string;
  category: string;
  code: string;
}

export const EXAMPLES: CodeExample[] = [
  // ── Basics ──
  {
    title: 'Variables & Types',
    category: 'Basics',
    code: `let num = 42;
let str = "hello";
let bool = true;
let nothing = null;
let undef = undefined;
console.log(num, str, bool, nothing, undef);`,
  },
  {
    title: 'For Loop',
    category: 'Basics',
    code: `let sum = 0;
for (let i = 1; i <= 5; i++) {
  sum += i;
}
console.log("Sum:", sum);`,
  },
  {
    title: 'While Loop',
    category: 'Basics',
    code: `let n = 1;
while (n < 100) {
  n = n * 2;
}
console.log(n);`,
  },
  {
    title: 'Conditionals',
    category: 'Basics',
    code: `let age = 20;
let category;

if (age < 13) {
  category = "child";
} else if (age < 18) {
  category = "teenager";
} else {
  category = "adult";
}
console.log(category);`,
  },

  // ── Functions ──
  {
    title: 'Recursion (Fibonacci)',
    category: 'Functions',
    code: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

let result = fibonacci(5);
console.log("fib(5) =", result);`,
  },
  {
    title: 'Closures',
    category: 'Functions',
    code: `function makeCounter() {
  let count = 0;
  return function increment() {
    count++;
    return count;
  };
}

let counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3`,
  },
  {
    title: 'Higher-Order Functions',
    category: 'Functions',
    code: `let numbers = [1, 2, 3, 4, 5];

let doubled = numbers.map(function(n) {
  return n * 2;
});

let evens = doubled.filter(function(n) {
  return n % 2 === 0;
});

console.log("doubled:", doubled);
console.log("evens:", evens);`,
  },

  // ── Data Structures ──
  {
    title: 'Linked List',
    category: 'Data Structures',
    code: `function createNode(value, next) {
  return { value: value, next: next };
}

let list = null;
for (let i = 3; i >= 1; i--) {
  list = createNode(i, list);
}

// Traverse
let current = list;
while (current !== null) {
  console.log(current.value);
  current = current.next;
}`,
  },
  {
    title: 'Stack (Array)',
    category: 'Data Structures',
    code: `let stack = [];

stack.push(10);
stack.push(20);
stack.push(30);
console.log("Stack:", stack);

let top = stack.pop();
console.log("Popped:", top);
console.log("Stack now:", stack);`,
  },

  // ── Objects & Classes ──
  {
    title: 'Objects & Methods',
    category: 'Objects & Classes',
    code: `let person = {
  name: "Alice",
  age: 25,
  greet: function() {
    return "Hi, I'm " + this.name;
  }
};

console.log(person.greet());
person.age = 26;
console.log(person.name, "is", person.age);`,
  },
  {
    title: 'Classes',
    category: 'Objects & Classes',
    code: `class Animal {
  constructor(name, sound) {
    this.name = name;
    this.sound = sound;
  }
  speak() {
    return this.name + " says " + this.sound;
  }
}

let cat = new Animal("Cat", "meow");
let dog = new Animal("Dog", "woof");
console.log(cat.speak());
console.log(dog.speak());`,
  },

//   // ── Async ──
//   {
//     title: 'setTimeout',
//     category: 'Async',
//     code: `console.log("Start");

// setTimeout(function() {
//   console.log("Timeout fired!");
// }, 1000);

// console.log("End");`,
//   },
//   {
//     title: 'Promises',
//     category: 'Async',
//     code: `let promise = new Promise(function(resolve) {
//   resolve(42);
// });

// promise.then(function(value) {
//   console.log("Resolved:", value);
//   return value * 2;
// }).then(function(value) {
//   console.log("Chained:", value);
// });`,
//   },
];

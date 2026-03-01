import { Target } from 'te.js';

const hello = new Target('/hello');

// Basic route
hello.register('/', (ammo) => {
  ammo.fire({ message: 'Hello, World!' });
});

// Specific routes first (before /:name to avoid matching "greet" as a param)
hello.register('/greet', (ammo) => {
  const name = ammo.payload.name || 'Guest';
  ammo.fire({ message: `Hello, ${name}!` });
});

hello.register('/redirect', (ammo) => {
  ammo.redirect('/hello');
});

// Parameterized route - :name from path
hello.register('/:name', (ammo) => {
  const { name } = ammo.payload;
  ammo.fire({ message: `Hello, ${name}!` });
});

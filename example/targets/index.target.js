import { Target } from 'te.js';

const target = new Target();

target.register('/hello', (ammo) => {
  throw new Error('Error thrown to demonstrate robust error handling of te.js');
  ammo.fire({
    status: 200,
    body: 'Hello, World!'
  });
});

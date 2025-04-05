import { Target } from 'te.js';

const target = new Target();

target.withCache("group-id").register('/hello', (ammo) => {
  ammo.fire({
    status: 200,
    body: 'Hello, World!',
  });
});

target.purgeCache("group-id").register('/hello', (ammo) => {
  ammo.fire({
    status: 200,
    body: 'Hello, World!',
  });
});

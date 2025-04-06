import { Target } from 'te.js';

const target = new Target('/cache');

target.withCache('cache-1').register('/set-time', (ammo) => {
  ammo.fire(200);
});

import { Target, listAllEndpoints } from 'te.js';

const target = new Target();

target.register('/', (ammo) => {
  ammo.fire()
});

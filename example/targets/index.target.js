import { Target, TejError } from 'te.js';

const target = new Target();

target.register('/', (ammo) => {
  throw new TejError(500, 'Hello')
});

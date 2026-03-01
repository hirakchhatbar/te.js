import { Target, listAllEndpoints } from 'te.js';

const target = new Target();

target.register('/', (ammo) => {
  ammo.defaultEntry();
});

target.register('/health', (ammo) => {
  ammo.fire({ status: 'ok', timestamp: new Date().toISOString() });
});

target.register('/routes', (ammo) => {
  const grouped = listAllEndpoints(true);
  ammo.fire(grouped);
});

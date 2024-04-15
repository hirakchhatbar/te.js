import { Target } from 'te.js';
import auth from '../middlewares/auth.js';

const target = new Target();

target.register('/hello', (ammo) => {
  ammo.fire({
    status: 200,
    body: 'Hello, World!',
  });
});

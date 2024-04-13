import { Target } from "te.js";

const target = new Target();

target.register('/hello', (ammo) => {
  ammo.dispatch({
    status: 200,
    body: 'Hello, World!',
  });
});

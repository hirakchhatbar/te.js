import { Target } from "te.js";
import auth from "../middlewares/auth.js";

const target = new Target();
target.midair(auth);

target.register('/hello', (ammo) => {
  console.log(ammo.headers);

  ammo.dispatch({
    status: 200,
    body: 'Hello, World!',
  });
});

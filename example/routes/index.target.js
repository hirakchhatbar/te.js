import { Target } from "te.js";
import auth from "../middlewares/auth.js";

const target = new Target();
target.midair(auth);

target.register('/hello', (ammo) => {


  ammo.dispatch({
    status: 200,
    body: 'Hello, World!',
  });
});

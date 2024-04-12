import {Target} from 'te.js';
const target = new Target("/user");

target.register('/hello', (ammo) => {
    ammo.dispatch({message: 'Hello World!'});
});

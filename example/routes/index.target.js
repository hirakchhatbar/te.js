import {Target} from 'te.js';

const target = new Target();

target.register('/hello.js', (ammo) => {
    ammo.send("Hello World");
});
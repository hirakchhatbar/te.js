import {Tejas} from 'te.js';
import "./routes/index.target.js"

const tejas = new Tejas({
    targetsDir: "./routes/"
});
tejas.takeoff();

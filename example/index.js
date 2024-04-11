import {Tejas} from 'te.js';

import indexRouter from './routes/index.route.js';

const tejas = new Tejas();
tejas.target(indexRouter);

tejas.takeoff();

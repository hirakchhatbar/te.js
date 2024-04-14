import { Tejas } from 'te.js';
import './routes/index.target.js';

const tejas = new Tejas();
tejas.connectDatabase();
tejas.takeoff();

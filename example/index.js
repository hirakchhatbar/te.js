import { Tejas } from 'te.js';
import cors from 'cors';

const tejas = new Tejas();

tejas.midair(cors());

tejas.takeoff();

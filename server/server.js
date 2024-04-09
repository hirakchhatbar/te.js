import {createServer} from 'node:http';
import TejLogger from '../logger/index.js';
import TejEnv from './../../tej-env/index.js';
import app from './routing/app.js';

TejEnv.init();

class Tejas {

  /*
    * Constructor for Tejas
    * @param {Object} options - Options for Tejas
    * @param {Number} options.port - Port to listen on
    * @param {Array} options.checklist - Checklist for Tejas
   */
  constructor(options) {
    this.logger = new TejLogger('Tejas');
    this.port = options?.port || TejEnv.get('PORT') || 3000;
    this.checklist = options?.checklist || [];
  }

  takeoff() {
    this.engine = createServer(app);
    this.engine.listen(this.port, () => {
      this.logger.info(`Tejas is taking off from ${this.port}`);
    });

    this.engine.on('listening', () => {
      for (const next of this.checklist) {
        if (typeof next === 'function') next();
        else this.logger.error(
            `Checklist item ${next} is not a function. Skipping...`);
      }
    });
  }

  onRunway(...checklist) {
    this.checklist.push(...checklist);
  }
}

export default Tejas;

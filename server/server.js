import {createServer} from 'node:http';
import {TejEnv} from './../../tej-env/index.js';
import TejLogger from '../logger/index.js';
import handler from './routing/handler.js';
import {connectMongoDB} from "./../database/mongo.js";

TejEnv.init();

class Tejas {
  /*
    * Constructor for Tejas
    * @param {Object} options - Options for Tejas
    * @param {Boolean} options.debug - Debug mode
    * @param {Number} options.port - Port to listen on
    * @param {Array} options.checklist - Checklist for Tejas
    * @param {Boolean} options.mongoDB - Whether to connect to MongoDB
   */

  constructor(options) {
    this.debug = options?.debug || TejEnv.get('DEBUG') || false;
    this.logger = new TejLogger('Tejas');
    this.port = options?.port || TejEnv.get('PORT') || 1403;
    this.checklist = options?.checklist || [];

    if (options?.mongoDB) (async () => {
      await connectMongoDB();
    })();
  }

  takeoff() {
    this.engine = createServer(handler);
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

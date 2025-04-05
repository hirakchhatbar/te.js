import { createServer } from 'node:http';

import { env, setEnv } from 'tej-env';
import TejLogger from 'tej-logger';
import database from './database/index.js';

import TargetRegistry from './server/targets/registry.js';

import { loadConfigFile, standardizeObj } from './utils/configuration.js';

import targetHandler from './server/handler.js';
import { findTargetFiles } from './utils/auto-register.js';
import { pathToFileURL } from 'node:url';

const logger = new TejLogger('Tejas');
const targetRegistry = new TargetRegistry();

class Tejas {
  /*
   * Constructor for Tejas
   * @param {Object} args - Arguments for Tejas
   * @param {Number} args.port - Port to run Tejas on
   * @param {Boolean} args.log.http_requests - Whether to log incoming HTTP requests
   * @param {Boolean} args.log.exceptions - Whether to log exceptions
   * @param {String} args.db.type - Database type. It can be 'mongodb', 'mysql', 'postgres', 'sqlite'
   * @param {String} args.db.uri - Connection URI string for the database
   */
  constructor(args) {
    if (Tejas.instance) return Tejas.instance;
    Tejas.instance = this;

    this.generateConfiguration(args);
    this.registerTargetsDir();
  }

  /*
   * Connect to a database
   * @param {Object}
   * @param {String} args.db - Database type. It can be 'mongodb', 'mysql', 'postgres', 'sqlite'
   * @param {String} args.uri - Connection URI string for the database
   * @param {Object} args.options - Options for the database connection
   */
  connectDatabase(args) {
    const db = env('DB_TYPE');
    const uri = env('DB_URI');

    if (!db) return;
    if (!uri) {
      logger.error(
        `Tejas could not connect to ${db} as it couldn't find a connection URI. See our documentation for more information.`,
        false,
      );
      return;
    }

    const connect = database[db];
    if (!connect) {
      logger.error(
        `Tejas could not connect to ${db} as it is not supported. See our documentation for more information.`,
        false,
      );
      return;
    }

    connect(uri, {}, (error) => {
      if (error) {
        logger.error(
          `Tejas could not connect to ${db}. Error: ${error}`,
          false,
        );
        return;
      }

      logger.info(`Tejas connected to ${db} successfully.`);
    });
  }

  generateConfiguration(options) {
    const configVars = standardizeObj(loadConfigFile());
    const envVars = standardizeObj(process.env);
    const userVars = standardizeObj(options);

    const config = { ...configVars, ...envVars, ...userVars };
    for (const key in config) {
      if (config.hasOwnProperty(key)) {
        setEnv(key, config[key]);
      }
    }

    // Load defaults
    if (!env('PORT')) setEnv('PORT', 1403);
  }

  midair() {
    if (!arguments) return;
    targetRegistry.addGlobalMiddleware(...arguments);
  }

  registerTargetsDir() {
    findTargetFiles()
      .then((targetFiles) => {
        if (targetFiles) {
          for (const file of targetFiles) {
            import(pathToFileURL(`${file.parentPath}/${file.name}`));
          }
        }
      })
      .catch((err) => {
        logger.error(
          `Tejas could not register target files. Error: ${err}`,
          false,
        );
      });
  }

  takeoff() {
    this.engine = createServer(targetHandler);
    this.engine.listen(env('PORT'), () => {
      logger.info(`Took off from port ${env('PORT')}`);
      this.connectDatabase();
    });
  }
}

const listAllEndpoints = (grouped = false) => {
  return targetRegistry.getAllEndpoints(grouped);
};

export { default as Target } from './server/target.js';
export { default as TejFileUploader } from './server/files/uploader.js';
export { listAllEndpoints };
export default Tejas;

// TODO Ability to register a target (route) from tejas instance
// TODO tejas as CLI tool

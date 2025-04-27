import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TejLogger from 'tej-logger';
import TejError from '../server/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = new TejLogger('MongoDBConnectionManager');

function checkMongooseInstallation() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const nodeModulesPath = path.join(
    __dirname,
    '..',
    'node_modules',
    'mongoose',
  );

  try {
    // Check if mongoose exists in package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const inPackageJson = !!packageJson.dependencies?.mongoose;

    // Check if mongoose exists in node_modules
    const inNodeModules = fs.existsSync(nodeModulesPath);

    return {
      needsInstall: !inPackageJson || !inNodeModules,
      reason: !inPackageJson
        ? 'not in package.json'
        : !inNodeModules
          ? 'not in node_modules'
          : null,
    };
  } catch (error) {
    return { needsInstall: true, reason: 'error checking installation' };
  }
}

function installMongooseSync() {
  const spinner = ['|', '/', '-', '\\'];
  let current = 0;
  let intervalId;

  try {
    const { needsInstall, reason } = checkMongooseInstallation();

    if (!needsInstall) {
      return true;
    }

    // Start the spinner
    intervalId = setInterval(() => {
      process.stdout.write(`\r${spinner[current]} Installing mongoose...`);
      current = (current + 1) % spinner.length;
    }, 100);

    logger.info(`Tejas will install mongoose (${reason})...`);

    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const result = spawn.sync(command, ['install', 'mongoose'], {
      stdio: 'inherit',
      shell: true,
    });

    process.stdout.write('\r');
    clearInterval(intervalId);

    if (result.status === 0) {
      logger.info('Mongoose installed successfully');
      return true;
    } else {
      logger.error('Mongoose installation failed');
      return false;
    }
  } catch (error) {
    if (intervalId) {
      process.stdout.write('\r');
      clearInterval(intervalId);
    }
    logger.error('Error installing mongoose:', error);
    return false;
  }
}

/**
 * Create a new MongoDB connection
 * @param {Object} config - MongoDB configuration
 * @param {string} config.uri - MongoDB connection URI
 * @param {Object} [config.options={}] - Additional Mongoose options
 * @returns {Promise<mongoose.Connection>} Mongoose connection instance
 */
async function createConnection(config) {
  const { needsInstall } = checkMongooseInstallation();

  if (needsInstall) {
    const installed = installMongooseSync();
    if (!installed) {
      throw new TejError(500, 'Failed to install required mongoose package');
    }
  }

  const { uri, options = {} } = config;

  try {
    const mongoose = await import('mongoose').then((mod) => mod.default);
    const connection = await mongoose.createConnection(uri, options);

    connection.on('error', (err) =>
      logger.error(`MongoDB connection error:`, err),
    );
    connection.on('connected', () => {
      logger.info(`MongoDB connected to ${uri}`);
    });
    connection.on('disconnected', () => {
      logger.info(`MongoDB disconnected from ${uri}`);
    });

    return connection;
  } catch (error) {
    logger.error(`Failed to create MongoDB connection:`, error);
    throw new TejError(
      500,
      `Failed to create MongoDB connection: ${error.message}`,
    );
  }
}

/**
 * Close a MongoDB connection
 * @param {mongoose.Connection} connection - Mongoose connection to close
 * @returns {Promise<void>}
 */
async function closeConnection(connection) {
  if (connection) {
    await connection.close();
  }
}

export default {
  createConnection,
  closeConnection,
};

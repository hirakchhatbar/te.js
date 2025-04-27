import { createHash } from 'crypto';
import mongoose from 'mongoose';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from 'tej-logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

class MongoDBConnectionManager {
  static #instance = null;
  static #isInitializing = false;

  #connections = new Map();
  #connectionCount = 0;

  constructor() {
    if (MongoDBConnectionManager.#instance) {
      return MongoDBConnectionManager.#instance;
    }

    if (!MongoDBConnectionManager.#isInitializing) {
      throw new Error(
        'Use MongoDBConnectionManager.getInstance() to get the instance',
      );
    }

    MongoDBConnectionManager.#isInitializing = false;
    MongoDBConnectionManager.#instance = this;
  }

  /**
   * Get the singleton instance of MongoDBConnectionManager
   * @returns {MongoDBConnectionManager}
   */
  static getInstance() {
    if (!MongoDBConnectionManager.#instance) {
      MongoDBConnectionManager.#isInitializing = true;
      MongoDBConnectionManager.#instance = new MongoDBConnectionManager();
    }
    return MongoDBConnectionManager.#instance;
  }

  /**
   * Create a hash from the config object
   * @param {Object} config - MongoDB configuration
   * @returns {string} Hash string
   */
  #createConfigHash(config) {
    const normalizedConfig = {
      uri: config.uri,
      options: config.options || {},
    };
    return createHash('sha256')
      .update(JSON.stringify(normalizedConfig))
      .digest('hex');
  }

  /**
   * Create a new MongoDB connection
   * @param {Object} config - MongoDB configuration
   * @param {string} config.uri - MongoDB connection URI
   * @param {Object} [config.options={}] - Additional Mongoose options
   * @returns {Promise<mongoose.Connection>} Mongoose connection instance
   */
  async createConnection(config) {
    const { needsInstall } = checkMongooseInstallation();

    if (needsInstall) {
      const installed = installMongooseSync();
      if (!installed) {
        throw new Error('Failed to install required mongoose package');
      }
    }

    const configHash = this.#createConfigHash(config);

    if (this.#connections.has(configHash)) {
      return this.#connections.get(configHash);
    }

    const { uri, options = {} } = config;

    try {
      // Create a new connection
      const connection = await mongoose.createConnection(uri, options);

      // Handle connection events
      connection.on('error', (err) =>
        console.error(`MongoDB connection error:`, err),
      );
      connection.on('connected', () => {
        console.log(`MongoDB connected to ${uri}`);
        this.#connectionCount++;
      });
      connection.on('disconnected', () => {
        console.log(`MongoDB disconnected from ${uri}`);
        this.#connectionCount--;
      });

      this.#connections.set(configHash, connection);
      return connection;
    } catch (error) {
      console.error(`Failed to create MongoDB connection:`, error);
      throw error;
    }
  }

  /**
   * Get an existing MongoDB connection by config, creates a new connection if none exists
   * @param {Object} config - MongoDB configuration
   * @returns {Promise<mongoose.Connection>} Mongoose connection instance
   */
  async getClient(config) {
    const configHash = this.#createConfigHash(config);
    const existingConnection = this.#connections.get(configHash);

    if (existingConnection) {
      return existingConnection;
    }

    // If no connection exists, create a new one
    return this.createConnection(config);
  }

  /**
   * Close a MongoDB connection by config
   * @param {Object} config - MongoDB configuration
   * @returns {Promise<void>}
   */
  async closeConnection(config) {
    const configHash = this.#createConfigHash(config);
    const connection = this.#connections.get(configHash);
    if (connection) {
      await connection.close();
      this.#connections.delete(configHash);
    }
  }

  /**
   * Close all MongoDB connections
   * @returns {Promise<void>}
   */
  async closeAllConnections() {
    const closePromises = Array.from(this.#connections.values()).map(
      (connection) => connection.close(),
    );
    await Promise.all(closePromises);
    this.#connections.clear();
    this.#connectionCount = 0;
  }

  /**
   * Get the number of active connections
   * @returns {number}
   */
  getConnectionCount() {
    return this.#connectionCount;
  }

  /**
   * Get all active connection configurations
   * @returns {Array<Object>}
   */
  getActiveConnections() {
    return Array.from(this.#connections.entries()).map(
      ([hash, connection]) => ({
        hash,
        connection,
      }),
    );
  }
}

// Export the singleton instance
const mongodb = MongoDBConnectionManager.getInstance();
export default mongodb;

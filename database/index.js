import redis from './redis.js';
import mongodb from './mongodb.js';
import TejError from '../server/error.js';
import TejLogger from 'tej-logger';

const logger = new TejLogger('DatabaseManager');

class DatabaseManager {
  static #instance = null;
  static #isInitializing = false;

  // Enhanced connection tracking with metadata
  #connections = new Map();
  #initializingConnections = new Map();

  // Helper method for sleeping
  async #sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  constructor() {
    if (DatabaseManager.#instance) {
      return DatabaseManager.#instance;
    }

    if (!DatabaseManager.#isInitializing) {
      throw new TejError(
        500,
        'Use DatabaseManager.getInstance() to get the instance',
      );
    }

    DatabaseManager.#isInitializing = false;
    DatabaseManager.#instance = this;
  }

  static getInstance() {
    if (!DatabaseManager.#instance) {
      DatabaseManager.#isInitializing = true;
      DatabaseManager.#instance = new DatabaseManager();
    }
    return DatabaseManager.#instance;
  }

  async initializeConnection(dbType, config) {
    const key = dbType.toLowerCase();

    // If a connection already exists for this config, return it
    if (this.#connections.has(key)) {
      return this.#connections.get(key).client;
    }

    // Set initializing flag
    this.#initializingConnections.set(key, true);

    let client;
    try {
      switch (key) {
        case 'redis':
          client = await redis.createConnection({
            isCluster: config.isCluster || false,
            options: config || {},
          });
          break;
        case 'mongodb':
          client = await mongodb.createConnection(config);
          break;
        default:
          throw new TejError(400, `Unsupported database type: ${dbType}`);
      }

      this.#connections.set(key, {
        type: dbType,
        client,
        config,
      });

      // Clear initializing flag
      this.#initializingConnections.delete(key);

      return client;
    } catch (error) {
      // Clear initializing flag on error
      this.#initializingConnections.delete(key);
      logger.error(`Failed to initialize ${dbType} connection:`, error);
      throw error;
    }
  }

  getConnection(dbType) {
    const key = dbType.toLowerCase();
    const connection = this.#connections.get(key);
    if (!connection) {
      throw new TejError(
        404,
        `No connection found for ${dbType} with given config`,
      );
    }
    return connection.client;
  }

  async closeConnection(dbType, config) {
    const key = dbType.toLowerCase();
    if (!this.#connections.has(key)) {
      return;
    }

    try {
      const connection = this.#connections.get(key);
      switch (key) {
        case 'redis':
          await redis.closeConnection(connection.client);
          break;
        case 'mongodb':
          await mongodb.closeConnection(connection.client);
          break;
      }

      this.#connections.delete(key);
    } catch (error) {
      logger.error(`Error closing ${dbType} connection:`, error);
      throw error;
    }
  }

  /**
   * Close all database connections
   * @returns {Promise<void>}
   */
  async closeAllConnections() {
    const closePromises = [];
    for (const [key, connection] of this.#connections) {
      closePromises.push(
        this.closeConnection(connection.type, connection.config),
      );
    }
    await Promise.all(closePromises);
    this.#connections.clear();
  }

  /**
   * Get all active connections
   * @returns {Map<string, {type: string, client: any, config: Object}>}
   */
  getActiveConnections() {
    return new Map(this.#connections);
  }

  /**
   * Check if a connection exists or is being initialized
   * @param {string} dbType - Type of database
   * @param {Object} config - Database configuration
   * @returns {{ exists: boolean, initializing: boolean }}
   */
  hasConnection(dbType, config) {
    const key = dbType.toLowerCase();
    return {
      exists: this.#connections.has(key),
      initializing: this.#initializingConnections.has(key),
    };
  }
}

const dbManager = DatabaseManager.getInstance();
export default dbManager;

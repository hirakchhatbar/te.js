import redis from './redis.js';
import mongodb from './mongodb.js';
import TejError from '../server/error.js';

class DatabaseManager {
  static #instance = null;
  static #isInitializing = false;

  #connections = new Map();

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

  /**
   * Initialize a database connection
   * @param {string} dbType - Type of database ('redis', 'mongodb', etc.)
   * @param {Object} config - Database configuration
   * @returns {Promise<any>} Database client instance
   */
  async initializeConnection(dbType, config) {
    // If a connection already exists for this type, return it
    if (this.#connections.has(dbType)) {
      return this.#connections.get(dbType);
    }

    let client;
    try {
      switch (dbType.toLowerCase()) {
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

      this.#connections.set(dbType, client);
      return client;
    } catch (error) {
      console.error(`Failed to initialize ${dbType} connection:`, error);
      throw error;
    }
  }

  /**
   * Get a database connection
   * @param {string} dbType - Type of database
   * @returns {any} Database client instance
   */
  getConnection(dbType) {
    const connection = this.#connections.get(dbType);
    if (!connection) {
      throw new TejError(404, `No connection found for ${dbType}`);
    }
    return connection;
  }

  /**
   * Close a specific database connection
   * @param {string} dbType - Type of database
   * @returns {Promise<void>}
   */
  async closeConnection(dbType) {
    if (!this.#connections.has(dbType)) {
      return;
    }

    try {
      const connection = this.#connections.get(dbType);
      switch (dbType.toLowerCase()) {
        case 'redis':
          await redis.closeConnection({ url: connection.options.url });
          break;
        case 'mongodb':
          await mongodb.closeConnection({ uri: connection.options.uri });
          break;
      }

      this.#connections.delete(dbType);
    } catch (error) {
      console.error(`Error closing ${dbType} connection:`, error);
      throw error;
    }
  }

  /**
   * Close all database connections
   * @returns {Promise<void>}
   */
  async closeAllConnections() {
    const closePromises = [];
    for (const [dbType] of this.#connections) {
      closePromises.push(this.closeConnection(dbType));
    }
    await Promise.all(closePromises);
    this.#connections.clear();
  }

  /**
   * Get all active connections
   * @returns {Map<string, any>} Map of all active connections
   */
  getActiveConnections() {
    return new Map(this.#connections);
  }

  /**
   * Check if a connection exists
   * @param {string} dbType - Type of database
   * @returns {boolean}
   */
  hasConnection(dbType) {
    return this.#connections.has(dbType);
  }
}

const dbManager = DatabaseManager.getInstance();
export default dbManager;

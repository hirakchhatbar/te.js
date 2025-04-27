import redis from './redis.js';
import mongodb from './mongodb.js';
import TejError from '../server/error.js';

class DatabaseManager {
  static #instance = null;
  static #isInitializing = false;

  #connections = new Map();
  #defaultConnections = new Map();

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
   * @param {string} [connectionName='default'] - Unique name for this connection
   * @returns {Promise<any>} Database client instance
   */
  async initializeConnection(dbType, config, connectionName = 'global') {
    const connectionKey = `${dbType}:${connectionName}`;

    // Return existing connection if available
    if (this.#connections.has(connectionKey)) {
      return this.#connections.get(connectionKey);
    }

    let client;
    try {
      switch (dbType.toLowerCase()) {
        case 'redis':
          client = await redis.createConnection(config);
          break;
        case 'mongodb':
          client = await mongodb.createConnection(config);
          break;
        default:
          throw new TejError(400, `Unsupported database type: ${dbType}`);
      }

      this.#connections.set(connectionKey, client);

      // Set as default connection for this database type if none exists
      if (!this.#defaultConnections.has(dbType)) {
        this.#defaultConnections.set(dbType, connectionName);
      }

      return client;
    } catch (error) {
      console.error(`Failed to initialize ${dbType} connection:`, error);
      throw error;
    }
  }

  /**
   * Get a database connection
   * @param {string} dbType - Type of database
   * @param {string} [connectionName] - Name of the connection
   * @returns {any} Database client instance
   */
  getConnection(dbType, connectionName) {
    if (!connectionName) {
      connectionName = this.#defaultConnections.get(dbType);
      if (!connectionName) {
        throw new TejError(404, `No default connection found for ${dbType}`);
      }
    }

    const connectionKey = `${dbType}:${connectionName}`;
    const connection = this.#connections.get(connectionKey);

    if (!connection) {
      throw new TejError(
        404,
        `No connection found for ${dbType} with name ${connectionName}`,
      );
    }

    return connection;
  }

  /**
   * Close a specific database connection
   * @param {string} dbType - Type of database
   * @param {string} [connectionName='default'] - Name of the connection
   * @returns {Promise<void>}
   */
  async closeConnection(dbType, connectionName = 'default') {
    const connectionKey = `${dbType}:${connectionName}`;

    if (!this.#connections.has(connectionKey)) {
      return;
    }

    try {
      const connection = this.#connections.get(connectionKey);
      switch (dbType.toLowerCase()) {
        case 'redis':
          await redis.closeConnection({ url: connection.options.url });
          break;
        case 'mongodb':
          await mongodb.closeConnection({ uri: connection.options.uri });
          break;
      }

      this.#connections.delete(connectionKey);

      // Remove default connection reference if this was the default
      if (this.#defaultConnections.get(dbType) === connectionName) {
        this.#defaultConnections.delete(dbType);
      }
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

    for (const [connectionKey] of this.#connections) {
      const [dbType, connectionName] = connectionKey.split(':');
      closePromises.push(this.closeConnection(dbType, connectionName));
    }

    await Promise.all(closePromises);
    this.#connections.clear();
    this.#defaultConnections.clear();
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
   * @param {string} [connectionName='default'] - Name of the connection
   * @returns {boolean}
   */
  hasConnection(dbType, connectionName = 'default') {
    return this.#connections.has(`${dbType}:${connectionName}`);
  }
}

const dbManager = DatabaseManager.getInstance();
export default dbManager;

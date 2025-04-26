import { createClient, createCluster } from 'redis';
import { createHash } from 'crypto';

class RedisConnectionManager {
  static #instance = null;
  static #isInitializing = false;

  #clients = new Map();
  #connectionCount = 0;

  constructor() {
    if (RedisConnectionManager.#instance) {
      return RedisConnectionManager.#instance;
    }

    if (!RedisConnectionManager.#isInitializing) {
      throw new Error(
        'Use RedisConnectionManager.getInstance() to get the instance',
      );
    }

    RedisConnectionManager.#isInitializing = false;
    RedisConnectionManager.#instance = this;
  }

  /**
   * Get the singleton instance of RedisConnectionManager
   * @returns {RedisConnectionManager}
   */
  static getInstance() {
    if (!RedisConnectionManager.#instance) {
      RedisConnectionManager.#isInitializing = true;
      RedisConnectionManager.#instance = new RedisConnectionManager();
    }
    return RedisConnectionManager.#instance;
  }

  /**
   * Create a hash from the config object
   * @param {Object} config - Redis configuration
   * @returns {string} Hash string
   */
  #createConfigHash(config) {
    const normalizedConfig = {
      isCluster: config.isCluster || false,
      url: config.url,
      options: config.options || {},
    };
    return createHash('sha256')
      .update(JSON.stringify(normalizedConfig))
      .digest('hex');
  }

  /**
   * Create a new Redis client or cluster
   * @param {Object} config - Redis configuration
   * @param {boolean} [config.isCluster=false] - Whether to use Redis Cluster
   * @param {string|Object} config.url - Redis connection URL or configuration object
   * @param {Object} [config.options={}] - Additional Redis options
   * @returns {Promise<RedisClient|RedisCluster>} Redis client or cluster instance
   */
  async createConnection(config) {
    const configHash = this.#createConfigHash(config);

    if (this.#clients.has(configHash)) {
      return this.#clients.get(configHash);
    }

    const { isCluster = false, url, options = {} } = config;
    let client;

    try {
      if (isCluster) {
        client = createCluster({
          rootNodes: Array.isArray(url) ? url : [url],
          ...options,
        });
      } else {
        client = createClient({
          url,
          ...options,
        });
      }

      // Handle connection events
      client.on('error', (err) =>
        console.error(`Redis connection error:`, err),
      );
      client.on('connect', () => {
        console.log(`Redis connected`);
        this.#connectionCount++;
      });
      client.on('ready', () => console.log(`Redis ready`));
      client.on('end', () => {
        console.log(`Redis connection closed`);
        this.#connectionCount--;
      });

      await client.connect();
      this.#clients.set(configHash, client);
      return client;
    } catch (error) {
      console.error(`Failed to create Redis connection:`, error);
      throw error;
    }
  }

  /**
   * Get an existing Redis client or cluster by config, creates a new connection if none exists
   * @param {Object} config - Redis configuration
   * @returns {Promise<RedisClient|RedisCluster>} Redis client or cluster instance
   */
  async getClient(config) {
    const configHash = this.#createConfigHash(config);
    const existingClient = this.#clients.get(configHash);

    if (existingClient) {
      return existingClient;
    }

    // If no client exists, create a new connection
    return this.createConnection(config);
  }

  /**
   * Close a Redis connection by config
   * @param {Object} config - Redis configuration
   * @returns {Promise<void>}
   */
  async closeConnection(config) {
    const configHash = this.#createConfigHash(config);
    const client = this.#clients.get(configHash);
    if (client) {
      await client.quit();
      this.#clients.delete(configHash);
    }
  }

  /**
   * Close all Redis connections
   * @returns {Promise<void>}
   */
  async closeAllConnections() {
    const closePromises = Array.from(this.#clients.values()).map((client) =>
      client.quit(),
    );
    await Promise.all(closePromises);
    this.#clients.clear();
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
    return Array.from(this.#clients.entries()).map(([hash, client]) => ({
      hash,
      client,
    }));
  }
}

// Export the singleton instance
const redis = RedisConnectionManager.getInstance();
export default redis;

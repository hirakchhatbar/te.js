import { createClient, createCluster } from 'redis';
import { createHash } from 'crypto';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from 'tej-logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function checkRedisInstallation() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules', 'redis');

  try {
    // Check if redis exists in package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const inPackageJson = !!packageJson.dependencies?.redis;

    // Check if redis exists in node_modules
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

function installRedisSync() {
  const spinner = ['|', '/', '-', '\\'];
  let current = 0;
  let intervalId;

  try {
    const { needsInstall, reason } = checkRedisInstallation();

    if (!needsInstall) {
      return true;
    }

    // Start the spinner
    intervalId = setInterval(() => {
      process.stdout.write(`\r${spinner[current]} Installing redis...`);
      current = (current + 1) % spinner.length;
    }, 100);

    logger.info(`Tejas will install redis (${reason})...`);

    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const result = spawn.sync(command, ['install', 'redis'], {
      stdio: 'inherit',
      shell: true,
    });

    process.stdout.write('\r');
    clearInterval(intervalId);

    if (result.status === 0) {
      logger.info('Redis installed successfully');
      return true;
    } else {
      logger.error('Redis installation failed');
      return false;
    }
  } catch (error) {
    if (intervalId) {
      process.stdout.write('\r');
      clearInterval(intervalId);
    }
    logger.error('Error installing redis:', error);
    return false;
  }
}

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
    const { needsInstall } = checkRedisInstallation();

    if (needsInstall) {
      const installed = installRedisSync();
      if (!installed) {
        throw new Error('Failed to install required redis package');
      }
    }

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

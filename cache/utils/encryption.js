import crypto from 'crypto';
import { serialize, deserialize } from './data-type-handler.js';

const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32); // 256-bit key
const iv = crypto.randomBytes(16); // 128-bit IV

export function encrypt(data) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(serialize(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decrypt(data) {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return deserialize(decrypted);
}

export function generateKey(endpoint, params) {
  return `${endpoint}:${JSON.stringify(params)}`;
}

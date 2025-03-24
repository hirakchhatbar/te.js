class CacheEntity {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;

    this.size = CacheEntity.estimateSize(key, value);
  }

  static estimateSize(key, value) {
    const keySize = Buffer.byteLength(key, 'utf8');
    const valueSize = Buffer.byteLength(JSON.stringify(value), 'utf8');
    return keySize + valueSize;
  }
}

export default CacheEntity;

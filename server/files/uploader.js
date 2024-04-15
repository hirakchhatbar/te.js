import { extAndType, extract, paths } from './helper.js';
import fs from 'fs';
import { filesize } from 'filesize';

class TejFileUploader {
  /*
   * @param {Object} options
   * @param {string} options.destination - Destination to upload file to
   * @param {string} options.name - Name of the file
   * @param {number} options.maxFileSize - Maximum file size in bytes
   */
  constructor(options = {}) {
    this.destination = options.destination;
    this.name = options.name;
    this.maxFileSize = options.maxFileSize;
  }

  single() {
    const keys = [...arguments];
    return async (ammo, next) => {
      if (!ammo.headers['content-type'].startsWith('multipart/form-data'))
        return next();

      const payload = ammo.payload;
      const updatedPayload = {};

      for (const part in payload) {
        const obj = payload[part];
        const contentDisposition = obj.headers['content-disposition'];

        const { ext, type } = extAndType(obj);
        if (!ext) continue;

        const key = extract(contentDisposition, 'name');
        if (ext === 'txt') {
          updatedPayload[key] = obj.value;
        } else {
          if (!keys.includes(key)) continue;

          const filename = extract(contentDisposition, 'filename');
          if (!filename) continue;

          const { dir, absolute, relative } = paths(this.destination, filename);
          const size = filesize(obj.value.length, { output: 'object' });
          const maxSize = filesize(this.maxFileSize, { output: 'object' });
          if (this.maxFileSize && obj.value.length > this.maxFileSize)
            return ammo.throw(
              413,
              `Size of the file ${filename} exceeds the specified limit of ${maxSize.value} ${maxSize.symbol}`,
            );

          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(absolute, obj.value, 'binary');

          updatedPayload[key] = {
            filename,
            path: {
              absolute: absolute,
              relative: relative,
            },
            mimetype: type,
            size,
          };
        }
      }

      ammo.payload = updatedPayload;
      next();
    };
  }
}

export default TejFileUploader;

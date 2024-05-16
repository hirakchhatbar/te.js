import { filesize } from 'filesize';
import fs from 'node:fs';
import TejError from './../error.js';
import { extAndType, extract, paths } from './helper.js';

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

  file() {
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

        const key = extract(contentDisposition, 'name');
        if (!key) continue;

        if (!ext || ext === 'txt') {
          updatedPayload[key] = obj.value;
        } else {
          if (!keys.includes(key)) continue;

          const filename = extract(contentDisposition, 'filename');
          if (!filename) continue;

          const { dir, absolute, relative } = paths(this.destination, filename);
          const size = filesize(obj.value.length,
            { output: 'object', round: 0 });
          const maxSize = filesize(this.maxFileSize,
            { output: 'object', round: 0 });
          if (this.maxFileSize && obj.value.length > this.maxFileSize)
            throw new TejError(413,
              `File size exceeds ${maxSize.value} ${maxSize.symbol}`);

          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(absolute, obj.value, 'binary');

          updatedPayload[key] = {
            filename,
            extension: ext,
            path: {
              absolute: absolute,
              relative: relative
            },
            mimetype: type,
            size
          };
        }
      }

      ammo.payload = updatedPayload;
      next();
    };
  }

  files() {
    const keys = [...arguments];
    return async (ammo, next) => {
      if (!ammo.headers['content-type'].startsWith('multipart/form-data'))
        return next();

      const payload = ammo.payload;
      const updatedPayload = {};
      const files = [];

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
          const size = filesize(obj.value.length,
            { output: 'object', round: 0 });
          const maxSize = filesize(this.maxFileSize,
            { output: 'object', round: 0 });
          if (this.maxFileSize && obj.value.length > this.maxFileSize) {
            throw new TejError(413,
              `File size exceeds ${maxSize.value} ${maxSize.symbol}`);
          }

          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(absolute, obj.value, 'binary');

          files.push({
            key,
            filename,
            path: {
              absolute: absolute,
              relative: relative
            },
            mimetype: type,
            size
          });
        }
      }

      const groupedFilesByKey = files.reduce((acc, file) => {
        if (!acc[file.key]) acc[file.key] = [];
        acc[file.key].push(file);
        return acc;
      }, {});

      for (const key in groupedFilesByKey) {
        updatedPayload[key] = groupedFilesByKey[key];
      }

      ammo.payload = updatedPayload;
      next();
    };
  }
}

export default TejFileUploader;

import { pathToFileURL } from 'node:url';
import {execSync} from 'child_process';

const packagePath = `${process.cwd()}/node_modules/mongoose/index.js`;
let mongoose = undefined;

try {
   mongoose = await import(pathToFileURL(packagePath));
} catch (error) {
  execSync('npm install mongoose');
}

const connect = (uri, options, cb) => {
  if (!mongoose) return;
  mongoose
    .connect(uri, options)
    .then(() => {
      cb(undefined);
    })
    .catch((error) => {
      cb(error);
    });
};

export default connect;

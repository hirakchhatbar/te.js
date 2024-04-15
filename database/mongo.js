import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import TejLogger from 'tej-logger';

const packagePath = `${process.cwd()}/node_modules/mongoose/index.js`;
const logger = new TejLogger('Tejas CLI');

let mongoose = undefined;

const connect = async (uri, options, cb) => {

  try {
    mongoose = await import(pathToFileURL(packagePath));

  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      await installMongoose('npm install mongoose');
      mongoose = await import(pathToFileURL(packagePath));

    } else {
      cb(error);
    }

  } finally {
    mongoose.connect(uri, options).then(() => {
      cb(undefined);
    }).catch((error) => {
      cb(error);
    });
  }
};

function installMongoose(command) {
  return new Promise((resolve, reject) => {
    const spinner = ['|', '/', '-', '\\'];
    let current = 0;

    // Start the spinner
    const intervalId = setInterval(() => {
      process.stdout.write(`\r${spinner[current]} Installing mongoose...`);
      current = (current + 1) % spinner.length;
    }, 100);

    // Execute the command asynchronously to keep the spinner going
    const child = spawn(command, { shell: true });
    logger.info('Tejas will install mongoose to connect to mongodb...');

    child.stderr.on('data', (data) => {
      logger.error(`\n${data}`);
    });

    child.on('close', (code) => {
      process.stdout.write('\r');
      clearInterval(intervalId);
      if (code === 0) {
        // Remove stdout of Installing mongodb...
        logger.info('Mongoose installed successfully');
        resolve();
      } else {
        logger.error('Mongoose installation failed');
        reject();
      }
    });
  });
}

export default connect;

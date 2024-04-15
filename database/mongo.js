import mongoose from './../example/node_modules/mongoose/index.js';

const connect = (uri, options, cb) => {
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

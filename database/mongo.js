import mongoose from 'mongoose';
const connectMongoDB = async (uri, cb) => {
  if (!uri)
    return cb(new Error('MongoDB URI not provided'));

    try {
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true
        });
        cb(undefined);
    } catch (error) {
        cb(error)
    }
}

const disconnectMongoDB = async (cb) => {
    try {
        await mongoose.disconnect();
        cb(undefined);
    } catch (error) {
        cb(error);
    }
}

export {
    connectMongoDB,
    disconnectMongoDB
}



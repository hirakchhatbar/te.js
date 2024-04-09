import mongoose from 'mongoose';
import {data} from './../../tej-env/index.js'
const connectMongoDB = async () => {
  const uri = data.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not found in .env file');

    try {
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true
        });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB');
    }
}

const disconnectMongoDB = async () => {
    try {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error disconnecting from MongoDB');
    }
}

export {
    connectMongoDB,
    disconnectMongoDB
}



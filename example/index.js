import Tejas from 'te.js';

const redisConfig = {
  isCluster: false,
  socket: {
    host: 'ec2-54-175-198-215.compute-1.amazonaws.com',
    port: 1403,
  },
};

const tejas = new Tejas();
tejas.withRedis().withMongo().takeoff();

import {router} from './server/routing/router.js';
import Tejas from './server/server.js';

router.get('/abc', (req, res) => {
  res.write('Hello');
  res.end();
});

const tejas = new Tejas({
  mongoDB: true,
});
tejas.takeoff();

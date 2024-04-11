import {Target} from 'te.js';
const target = new Target();

import userRouter from './user/user.route.js';

target.get('/', (req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello, world!!');
});

target.post('/', (req, res) => {
  console.log(req.payload);
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello, world!');
});

target.use('/user', userRouter);

export default router;

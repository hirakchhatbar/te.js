import {Target} from 'te.js';

const target = new Target();

const registerMiddleware = (req, res) => {
  console.log("Register user middleware");
}

target.register('POST', '/register', registerMiddleware, (req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write('Hello User');
  res.end();
});
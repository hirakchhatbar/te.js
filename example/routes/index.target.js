import {Target} from 'te.js';

const target = new Target();

const middlewareA = (req, res) => {
  console.log("Target Middleware A");
}

target.midair(middlewareA);

target.register('GET', '/hello', (req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write('Hello World');
  res.end();
});
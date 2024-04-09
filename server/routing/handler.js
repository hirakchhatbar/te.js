import {aim} from './router.js';

const handler = (req, res) => {
  const target = aim(req);

  if (target) {
    target.shoot(req, res);
  } else {
    if (req.url === '/favicon.ico') {
      res.writeHead(200, {'Content-Type': 'image/x-icon'});
      res.end();
    } else if (req.url === '/') {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write('<h1>Tejas</h1>');
      res.end();
    } else {
      res.statusCode = 404;
      res.write('Not found');
      res.end();
    }
  }
};

export default handler;
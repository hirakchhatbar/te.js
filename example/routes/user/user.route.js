import {router} from "te.js";

router.get('/', (req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('user route');
});

export default router;

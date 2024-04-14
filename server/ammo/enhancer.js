import bodyParser from './body-parser.js';

function hostname(req) {
  let host = req.headers['X-Forwarded-Host'];

  if (!host) {
    host = req.headers.host;
  } else if (host.indexOf(',') !== -1) {
    host = host.substring(0, host.indexOf(',')).trimRight();
  }

  return host;
}

async function generatePayload(req) {
  const obj = {};

  const searchParams = new URLSearchParams(req.url.split('?')[1]);
  for (const [key, value] of searchParams) {
    obj[key] = value;
  }

  const body = await bodyParser(req);
  if (body) Object.assign(obj, body);
  return obj;
}

function protocol(req) {
  const proto = req.connection.encrypted ? 'https' : 'http';

  const header = req.headers['X-Forwarded-Proto'] || proto;
  const index = header.indexOf(',');

  return index !== -1 ? header.substring(0, index).trim() : header.trim();
}

const enhance = async (ammo) => {
  const req = ammo.req;

  ammo.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  ammo.headers = req.headers;
  ammo.payload = await generatePayload(req);
  ammo.method = req.method;

  ammo.protocol = protocol(req);
  ammo.hostname = hostname(req);
  ammo.path = req.url;
  ammo.endpoint = req.url.split('?')[0];

  ammo.fullURL = `${ammo.protocol}://${ammo.hostname}/${ammo.path}`;
};

export default enhance;

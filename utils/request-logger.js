import { env } from 'tej-env';
import ansi from 'ansi-colors';
import TejLogger from 'tej-logger';

const logger = new TejLogger('Tejas.Request');
const { italic, bold, blue, white, bgGreen, bgRed, whiteBright } = ansi;

function logHttpRequest(ammo, next) {
  if (!env('LOG_HTTP_REQUESTS')) return;

  const startTime = new Date();
  ammo.res.on('finish', () => {
    const res = ammo.res;
    const method = italic(whiteBright(ammo.method));
    const endpoint = bold(ammo.endpoint);
    const statusCode =
      res.statusCode >= 400
        ? bgRed(whiteBright(bold(`✖ ${res.statusCode}`)))
        : bgGreen(whiteBright(bold(`✔ ${res.statusCode}`)));

    const duration = white(`${new Date() - startTime}ms`);
    const payload = `${blue('Request')}: ${white(
      JSON.stringify(ammo.payload),
    )}`;
    const dispatchedData = `${blue('Response')}: ${white(ammo.dispatchedData)}`;
    const nextLine = '\n';

    logger.log(
      italic(`Incoming request from ${ammo.ip}`),
      nextLine,
      method,
      endpoint,
      statusCode,
      duration,
      nextLine,
      payload,
      nextLine,
      dispatchedData,
    );
  });
}

export default logHttpRequest;

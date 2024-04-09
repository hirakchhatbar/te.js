import { Console } from "node:console";

class TejLogger {
  constructor(identifier) {
    this.logger = new Console({
      stdout: process.stdout,
      stderr: process.stderr,
    });

    if (!identifier) throw new Error("Identifier is required for the logger");

    this.identifier = identifier;
  }

  log(message) {
    this.logger.log({ identifier: this.identifier, message });
  }

  error(message) {
    this.logger.error({ identifier: this.identifier, message });
  }

  warn(message) {
    this.logger.warn({
      identifier: this.identifier,
      message,
    });
  }

  info(message) {
    this.logger.info({
      identifier: this.identifier,
      message,
    });
  }

  debug(message) {
    this.logger.debug({
      identifier: this.identifier,
      message,
    });
  }
}

export default TejLogger;

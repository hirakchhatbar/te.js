// Create an event emitter class to listen for http server events

class RadioTower {

  constructor(tejas) {
    this.tejas = tejas;
  }

  onConnection(cb) {
    this.tejas.engine.on('connection', cb);
  }

  onListening(cb) {
    this.tejas.engine.on('listening', cb);
  }

  onError(cb) {
    this.tejas.engine.on('error', cb);
  }

  onClose(cb) {
    this.tejas.engine.on('close', cb);
  }
}
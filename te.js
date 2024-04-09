import Tejas from './server/server.js';

const a = () => {
  console.log('a');
}

const b = () => {
  console.log('b');
}

const tejas = new Tejas({
  checklist: [a, b],
  port: 1403
});
tejas.takeoff();
import TejLogger from 'tej-logger';
import Ammo from '../ammo.js';
const logger = new TejLogger('ShootValidator');

const isShootValid = (shoot) => {
  if (typeof shoot !== 'function') {
    logger.error(`Shoot ${shoot} should be a function. Skipping...`);
    return false;
  }

  // Shoot should have 1 parameter, and it must be an instance of Ammo
  if (shoot.length !== 1) {
    logger.error(`Shoot function must have 1 parameter. Skipping...`);
    return false;
  }


  return true;
};

export default isShootValid;

import { Target, TejError } from 'te.js';
import userService from '../services/user.service.js';

const users = new Target('/users');

users.register('/', (ammo) => {
  if (ammo.GET) {
    return ammo.fire(userService.list());
  }
  if (ammo.POST) {
    const user = userService.create(ammo.payload);
    if (!user) {
      throw new TejError(400, 'name and email are required');
    }
    return ammo.fire(201, user);
  }
  ammo.notAllowed();
});

users.register('/:id', (ammo) => {
  const { id } = ammo.payload;
  const user = userService.getById(id);

  if (ammo.GET) {
    if (!user) return ammo.notFound();
    return ammo.fire(user);
  }
  if (ammo.PUT) {
    if (!user) return ammo.notFound();
    const updated = userService.update(id, ammo.payload);
    return ammo.fire(updated);
  }
  if (ammo.DELETE) {
    if (!userService.delete(id)) return ammo.notFound();
    return ammo.fire(204);
  }

  ammo.notAllowed();
});

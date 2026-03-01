/**
 * User service - in-memory CRUD for demo purposes.
 * Demonstrates business logic extraction from route handlers.
 */

const store = [];
let nextId = 1;

export default {
  list() {
    return [...store];
  },

  getById(id) {
    return store.find((u) => String(u.id) === String(id));
  },

  create({ name, email }) {
    if (!name || !email) {
      return null;
    }
    const user = { id: nextId++, name, email, createdAt: new Date().toISOString() };
    store.push(user);
    return user;
  },

  update(id, { name, email }) {
    const user = this.getById(id);
    if (!user) return null;
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    user.updatedAt = new Date().toISOString();
    return user;
  },

  delete(id) {
    const index = store.findIndex((u) => String(u.id) === String(id));
    if (index === -1) return false;
    store.splice(index, 1);
    return true;
  },
};

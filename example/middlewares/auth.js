const auth = (ammo, next) => {
  if (ammo.headers.authorization === "Bearer 123") {
    next();
  } else {
    return ammo.unauthorized();
  }
};

export default auth;

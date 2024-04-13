const auth = (ammo, next) => {
  if (ammo.headers.authorization === "Bearer 123") {
    next();
  } else {
    ammo.dispatch(401)
  }
};

export default auth;

const globalMidair = async (ammo, next) => {
  console.log('Global middleware');
  await next();
};

export { globalMidair };

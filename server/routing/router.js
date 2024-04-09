class Targets {
  constructor() {
    if (Targets.instance) {
      return Targets.instance;
    }

    Targets.instance = this;
    this.paths = [];
  }

  get(endpoint, shoot) {
    this.paths.push({
      method: "GET",
      endpoint,
      shoot
    });
  }

  post(endpoint, shoot) {
    this.paths.push({
      method: "POST",
      endpoint,
      shoot
    });
  }

  put(endpoint, shoot) {
    this.paths.push({
      method: "PUT",
      endpoint,
      shoot
    });
  }

  delete(endpoint, shoot) {
    this.paths.push({
      method: "DELETE",
      endpoint,
      shoot
    });
  }
}

const router = new Targets();

const aim = (req) => {
  const endpoint = req.url;
  const method = req.method;

  return router.paths.find(path => {
    return path.endpoint === endpoint && path.method === method;
  });
}

export {
  aim,
  router
}
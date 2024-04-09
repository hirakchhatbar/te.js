class Target {
  constructor() {
    this.targets = [];
  }

  get(endpoint, shoot) {
    this.targets.push({
      method: "GET",
      endpoint,
      shoot,
    });
  }

  post(endpoint, shoot) {
    this.targets.push({
      method: "POST",
      endpoint,
      shoot,
    });
  }

  put(endpoint, shoot) {
    this.targets.push({
      method: "PUT",
      endpoint,
      shoot,
    });
  }

  delete(endpoint, shoot) {
    this.targets.push({
      method: "DELETE",
      endpoint,
      shoot,
    });
  }
}

export default Target;
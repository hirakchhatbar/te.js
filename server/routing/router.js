class Router {
    constructor(app) {
        this.app = app;
        this.setupRoutes();
    }

    setupRoutes() {
        this.app.get('/', (req, res) => {
            res.send('Hello World');
        });
    }
}
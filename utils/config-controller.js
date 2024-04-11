import * as fs from "fs";

const loadConfigFile = () => {
    try {
        const data = fs.readFileSync("tejas.config.json", "utf8");
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
};

const standardizeObj = (obj) => {
    if (!obj) return {};
    const keys = Object.keys(obj);
    const standardKeys = keys.map((key) => key.toUpperCase());
    const standardObj = {};

    for (let i = 0; i < keys.length; i++) {
        standardObj[standardKeys[i]] = obj[keys[i]];
    }

    return standardObj;
};

class ConfigController {

    /*
   * Constructor for Tejas
   * @param {Object} options - Options for Tejas
   * @param {Boolean} options.debug - Debug mode
   * @param {Number} options.port - Port to listen on
   * @param {Boolean} options.mongoDB - Whether to connect to MongoDB
   */
    constructor(options) {
        this.configVars = standardizeObj(loadConfigFile());
        this.envVars = standardizeObj(process.env);
        this.userVars = standardizeObj(options);

        this.config = {};
    }

    generate() {
        const configVars = this.configVars;
        const envVars = this.envVars;
        const userVars = this.userVars;

        const port =
            userVars.PORT || envVars.PORT || configVars.PORT || 1403;
        const logger =
            userVars.LOGGER ||
            envVars.LOGGER ||
            configVars.LOGGER ||
            true;
        const mongoDB =
            userVars.MONGODB ||
            envVars.MONGODB ||
            configVars.MONGODB ||
            undefined

        this.config = {
            port,
            logger,
            mongoDB,
        };

        return this.config;
    }
}

export default ConfigController;

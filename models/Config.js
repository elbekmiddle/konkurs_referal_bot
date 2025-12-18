const db = require("../utils/fileDatabase");

class Config {
  static async findOne(query) {
    const config = await db.getConfig();
    if (query.key) {
      return {
        key: query.key,
        value: config[query.key],
        save: async function () {
          config[this.key] = this.value;
          return await db.saveConfig(config);
        },
      };
    }
    return null;
  }

  static async find(query = {}) {
    const config = await db.getConfig();
    const results = [];

    for (let key in config) {
      if (!query.key || key === query.key) {
        results.push({
          key: key,
          value: config[key],
        });
      }
    }

    return results;
  }

  static async updateConfig(key, value, description = "") {
    const config = await db.getConfig();
    config[key] = value;
    await db.saveConfig(config);
    return {
      key,
      value,
      description,
      updatedAt: new Date(),
      save: async function () {
        config[this.key] = this.value;
        return await db.saveConfig(config);
      },
    };
  }
}

module.exports = Config;

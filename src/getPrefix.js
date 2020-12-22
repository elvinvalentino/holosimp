const mongo = require('./mongo');
const ConfigSchema = require('./configSchema');
const configCache = require('./configCache');

function getPrefix(guildId) {
  return new Promise((res, rej) => {
    try {
      mongo().then(async (mongoose) => {
        try {
          const config = await ConfigSchema.findById(guildId);
          if (config) {
            if (!config.prefix) {
              await ConfigSchema.findByIdAndUpdate(guildId, {
                _id: guildId,
                prefix: '*'
              });
            }

            configCache[guildId] = {
              ...configCache[guildId],
              prefix: config.prefix || '*'
            };
            res(config.prefix);
          } else {
            await new ConfigSchema({
              _id: guildId,
              prefix: '*'
            }).save();
            configCache[guildId] = {
              ...configCache[guildId],
              prefix: '*'
            };
            res(false);
          }
        } finally {
          mongoose.connection.close();
        }
      });
    } catch (err) {
      rej(err);
    }
  });
}
exports.getPrefix = getPrefix;

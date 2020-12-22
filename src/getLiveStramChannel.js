const mongo = require('./mongo');
const configCache = require('./configCache');
const ConfigSchema = require('./configSchema');

function getLiveStramChannel(guildId) {
  return new Promise((res, rej) => {
    try {
      mongo().then(async (mongoose) => {
        try {
          const config = await ConfigSchema.findOne({ _id: guildId });
          if (config.streamChannelId) {
            configCache[guildId] = {
              ...configCache[guildId],
              streamChannelId: config.streamChannelId
            };
            res(config.streamChannelId);
          } else {
            configCache[guildId] = {
              ...configCache[guildId],
              streamChannelId: 'empty'
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
exports.getLiveStramChannel = getLiveStramChannel;

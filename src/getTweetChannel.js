const mongo = require('./mongo');
const ConfigSchema = require('./configSchema');
const configCache = require('./configCache');

function getTweetChannel(guildId) {
  return new Promise((res, rej) => {
    try {
      mongo().then(async (mongoose) => {
        try {
          const config = await ConfigSchema.findOne({ _id: guildId });
          if (config.tweetChannelId) {
            configCache[guildId] = {
              ...configCache[guildId],
              tweetChannelId: config.tweetChannelId
            };
            res(config.tweetChannelId);
          } else {
            configCache[guildId] = {
              ...configCache[guildId],
              tweetChannelId: 'empty'
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
exports.getTweetChannel = getTweetChannel;

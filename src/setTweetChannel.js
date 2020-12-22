const mongo = require('./mongo');
const ConfigSchema = require('./configSchema');
const configCache = require('./configCache');
const invalidCommandMessage = require("./invalidCommandMessage");


async function setTweetChannel(args, message) {
  if (args.length > 0)
    return message.channel.send(invalidCommandMessage);
  const channelId = message.channel.id;
  const guildId = message.guild.id;

  configCache[guildId] = {
    ...configCache[guildId],
    tweetChannelId: channelId
  };

  await mongo().then(async (mongoose) => {
    try {
      await ConfigSchema.findByIdAndUpdate(
        { _id: guildId },
        {
          _id: guildId,
          tweetChannelId: channelId
        },
        {
          upsert: true
        }
      );
    } finally {
      mongoose.connection.close();
    }
  });

  message.channel.send(`Every tweets will be send to this channel!`);
}
exports.setTweetChannel = setTweetChannel;

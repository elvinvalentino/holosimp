const mongo = require('./mongo');
const ConfigSchema = require('./configSchema');
const configCache = require('./configCache');
const invalidCommandMessage = require("./invalidCommandMessage");


async function setLivestreamChannel(args, message) {
  if (args.length > 0)
    return message.channel.send(invalidCommandMessage);

  const channelId = message.channel.id;
  const guildId = message.guild.id;

  configCache[guildId] = {
    ...configCache[guildId],
    streamChannelId: channelId
  };

  await mongo().then(async (mongoose) => {
    try {
      await ConfigSchema.findByIdAndUpdate(
        { _id: guildId },
        {
          _id: guildId,
          streamChannelId: channelId
        },
        {
          upsert: true
        }
      );
    } finally {
      mongoose.connection.close();
    }
  });

  message.channel.send(`Every livestream notification will be send to this channel!`);
}
exports.setLivestreamChannel = setLivestreamChannel;

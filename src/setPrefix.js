const mongo = require('./mongo');
const ConfigSchema = require('./configSchema');
const configCache = require('./configCache');
const invalidCommandMessage = require("./invalidCommandMessage");


async function setPrefix(args, message) {
  if (args.length > 1)
    return message.channel.send(invalidCommandMessage);
  const prefix = args[0];
  const guildId = message.guild.id;
  configCache[guildId] = {
    ...configCache[guildId],
    prefix
  };

  await mongo().then(async (mongoose) => {
    try {
      await ConfigSchema.findByIdAndUpdate(
        { _id: guildId },
        {
          _id: guildId,
          prefix
        },
        {
          upsert: true
        }
      );
    } finally {
      mongoose.connection.close();
    }
  });

  message.channel.send(`Prefix set to ${prefix}`);

}
exports.setPrefix = setPrefix;

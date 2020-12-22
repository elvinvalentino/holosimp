require('dotenv').config();

const express = require('express');
const Twit = require('twit');
const app = express();
const { Client, } = require('discord.js');

const mongo = require('./mongo');
const ConfigSchema = require('./configSchema');
const configCache = require('./configCache');
const client = new Client();
let clientIsReady = false;
const fetchApiInterval = 300000;
const port = process.env.PORT || 5000;
const { setCurrentlyStreamingUser, watchApi } = require('./youtubeNotification');
const { sendHelp } = require("./sendHelp");
const { runLiveStreamCmd } = require("./runLiveStreamCmd");
const { runUpcomingLiveStreamCmd } = require("./runUpcomingLiveStreamCmd");
const { setPrefix } = require("./setPrefix");
const { getTweetChannel } = require("./getTweetChannel");
const { setTweetChannel } = require("./setTweetChannel");
const { setLivestreamChannel } = require("./setLivestreamChannel");
const { getPrefix } = require("./getPrefix");
const invalidCommandMessage = require('./invalidCommandMessage');
const hololiveMemberIds = require('./hololiveMemberIds');

const T = new Twit({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

client.login(process.env.DISCORDJS_BOT_TOKEN);

client.on('ready', async () => {
  clientIsReady = true;
  await mongo().then(async mongoose => {
    try {
      console.log('Mongodb is connected');
      const configs = await ConfigSchema.find();
      configs.forEach(config => {
        configCache[config._id] = {}
      })
    } finally {
      mongoose.connection.close();
    }
  })
  await setCurrentlyStreamingUser();
  setInterval(() => watchApi(client), fetchApiInterval);
  console.log(`${client.user.tag} is ready`);
})

// T.get('users/show', { screen_name: '7216_2nd' }, (err, data, res) => {
//   if (err) return console.log(err);
//   console.log(data)
// })

const stream = T.stream('statuses/filter', { follow: Object.values(hololiveMemberIds) });

stream.on('tweet', (tweet) => {
  client.emit('newTweet', { data: tweet })
})

client.on('newTweet', data => {
  if (!clientIsReady) return;
  data = data.data
  client.guilds.cache.forEach(async guild => {
    if (Object.values(hololiveMemberIds).includes(data.user.id_str)) {
      const channelId = configCache[guild.id].hasOwnProperty('tweetChannelId') ? configCache[guild.id].tweetChannelId : await getTweetChannel(guild.id);
      if (!channelId || channelId === 'empty') return;
      const channel = guild.channels.cache.get(channelId);
      if (data.in_reply_to_status_id) {
        channel.send(`**@${data.user.screen_name}** replied`);
      } else if (data.hasOwnProperty('retweeted_status')) {
        channel.send(`**@${data.user.screen_name}** retweeted`);
      } else {
        channel.send(`**@${data.user.screen_name}** tweeted`);
      }
      channel.send(`https://twitter.com/${data.user.screen_name}/status/${data.id_str}`);
    }
  })

})

client.on('guildCreate', async guild => {
  configCache[guild.id] = {};
  mongo().then(async mongoose => {
    try {
      await ConfigSchema.findOneAndUpdate(
        { _id: guild.id },
        {
          _id: guild.id,
          prefix: '*'
        },
        {
          upsert: true
        }
      )
    } finally {
      mongoose.connection.close();
    }
  })
})

client.on('message', async message => {
  const guildId = message.guild.id;
  let PREFIX = configCache[guildId].hasOwnProperty('prefix') ? configCache[guildId].prefix : await getPrefix(guildId);
  if (!PREFIX) PREFIX = '*';
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;
  if (!message.guild) return;
  const [CMD_NAME, ...args] = message.content
    .trim()
    .substring(PREFIX.length)
    .split(/\s+/);
  switch (CMD_NAME) {
    case 'setprefix':
      setPrefix(args, message);
      break;
    case 'settweetchannel':
    case 'stc':
      setTweetChannel(args, message);
      break;
    case 'setlivestreamchannel':
    case 'slc':
      setLivestreamChannel(args, message);
      break;
    case 'sendtojail':
      message.channel.send(`Sent ${args[0]} to jail 🚓`);
      break;
    case 'spam':
      const count = args[0];
      if (count > 5) return message.channel.send('Count cannot more than 5');
      const content = args.slice(1).join(' ');
      for (let i = 0; i < count; i++) {
        message.channel.send(content)
      }
      break;
    case 'status':
      message.channel.send('**Status: Alive**');
      break;
    case 'livestream':
    case 'ls':
      runLiveStreamCmd(message);
      break;
    case 'upcominglivestream':
    case 'uls':
      runUpcomingLiveStreamCmd(message);
      break;
    case 'help':
      sendHelp(message);
      break;
    default:
      message.channel.send(invalidCommandMessage);
  }
})

app.get("/", (req, res) => {
  res.end('Nothing to see here')
});

app.listen(port, () => console.log(`App is running on ${port}`))
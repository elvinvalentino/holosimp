require('dotenv').config();

const express = require('express');
const fetch = require('node-fetch');
const moment = require('moment');
const Twit = require('twit');
const app = express();

const port = process.env.PORT || 5000;
let clientIsReady = false;
const { Client, MessageEmbed } = require('discord.js');
const client = new Client();
const mongo = require('./mongo');
const fetchApiInterval = 300000;
const ConfigSchema = require('./configSchema');

const invalidCommandMessage = 'Invalid Command, please type *<prefix>*help to see the commands';
const configCache = {};

const hololiveMemberIds = {
  'suisei_hosimati': '975275878673408001',
  'tokino_sora': '880317891249188864',
  'robocosan': '960340787782299648',
  'sakuramiko35': '979891380616019968',
  'AZKi_VDiVA': '1062499145267605504',
  'akirosenthal': '996643748862836736',
  'natsuiromatsuri': '996645451045617664',
  '7216_2nd': '1122810226153938944',
  'shirakamifubuki': '997786053124616192',
  'akaihaato': '998336069992001537',
  'yozoramel': '985703615758123008',
  'oozorasubaru': '1027853566780698624',
  'yuzukichococh': '1024970912859189248',
  'nakiriayame': '1024532356554608640',
  'minatoaqua': '1024528894940987392',
  'murasakishionch': '1024533638879166464',
  'houshoumarine': '1153192638645821440',
  'shiranuiflare': '1154304634569150464',
  'usadapekora': '1133215093246664706',
  'uruharushia': '1142975277175205888',
  'shiroganenoel': '1153195295573856256',
  'tokoyamitowa': '1200357161747939328',
  'amanekanatach': '1200396304360206337',
  'tsunomakiwatame': '1200397643479805957',
  'kiryucoco': '1200397238788247552',
  'himemoriluna': '1200396798281445376',
  'omarupolka': '1270551806993547265',
  'shishirobotan': '1255015814979186689',
  'momosuzunene': '1255017971363090432',
  'yukihanalamy': '1255013740799356929',
  'watsonameliaEN': '1283656034305769472',
  'gawrgura': '1283657064410017793',
  'ninomaeinanis': '1283650008835743744',
  'takanashikiara': '1283646922406760448',
  'moricalliope': '1283653858510598144',
  'nekomataokayu': '1109751762733301760',
  'ookamimio': '1063337246231687169',
  'inugamikorone': '1109748792721432577',
  'ayunda_risu': '1234752200145899520',
  'moonahoshinova': '1234753886520393729',
  'airaniiofifteen': '1235180878449397764',
  'pavoliareine': '1328275136575799297',
  'anyamelfissa': '1328277750000492545',
  'kureijiollie': '1328277233492844544',
  'achan_UGA': '1064352899705143297',
  'hololive_Id': '1204978594490961920',
  'hololive_En': '1198438560224829442',
  'hololive_Jp': '1279066164186906629',
  'dt52231658': '1041683084213538816'
}

const T = new Twit({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

client.login(process.env.DISCORDJS_BOT_TOKEN);

const currentlyStreaming = new Set();

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
  setInterval(watchApi, fetchApiInterval);
  console.log(`${client.user.tag} is ready`);
})

function setCurrentlyStreamingUser() {
  return new Promise((res, rej) => {
    fetch('https://api.holotools.app/v1/live?max_upcoming_hours=48&hide_channel_desc=1')
      .then(res => res.json())
      .then(({ live }) => {
        live.forEach(live => {
          currentlyStreaming.add(live.yt_video_key);
        })
        res();
      })
      .catch(err => rej(err))
  })
}

function watchApi() {
  fetch('https://api.holotools.app/v1/live?max_upcoming_hours=48&hide_channel_desc=1')
    .then(res => res.json())
    .then(({ live }) => {
      for (let stream of currentlyStreaming.keys()) {
        const isExist = live.find(live => live.yt_video_key === stream);
        if (!isExist) currentlyStreaming.delete(stream);
      }

      client.guilds.cache.forEach(async guild => {
        const channelId = configCache[guild.id].hasOwnProperty('streamChannelId') ? configCache[guild.id].streamChannelId : await getLiveStramChannel(guild.id);
        if (!channelId || channelId === 'empty') return;

        live.forEach(live => {
          if (!currentlyStreaming.has(live.yt_video_key)) {
            if (guild.name === client.guilds.cache.last().name) {
              currentlyStreaming.add(live.yt_video_key)
            }
            const channel = guild.channels.cache.get(channelId);
            channel.send(`**${live.channel.name}** is now live!\nhttps://youtube.com/watch?v=${live.yt_video_key}`);
          }
        })
      })

    })
}


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

function sendHelp(message) {
  const embed = new MessageEmbed();
  embed.setTitle('Help')
    .setDescription(`
      **setprefix** - change prefix
      **settweetchannel / stc** - set channel to send tweet
      **setlivestreamchannel / slc** - set channel to notify livestream
      **livesream / ls** - get curently streaming list
      **upcominglivestream / uls** - get upcoming stream list
    `)
  message.channel.send(embed)
}

function getPrefix(guildId) {
  return new Promise((res, rej) => {
    try {
      mongo().then(async mongoose => {
        try {
          const config = await ConfigSchema.findById(guildId);
          if (config) {
            if (!config.prefix) {
              await ConfigSchema.findByIdAndUpdate(guildId, {
                _id: guildId,
                prefix: '*'
              })
            }

            configCache[guildId] = {
              ...configCache[guildId],
              prefix: config.prefix || '*'
            }
            res(config.prefix);
          } else {
            await new ConfigSchema({
              _id: guildId,
              prefix: '*'
            }).save();
            configCache[guildId] = {
              ...configCache[guildId],
              prefix: '*'
            }
            res(false)
          }
        } finally {
          mongoose.connection.close();
        }
      })
    } catch (err) {
      rej(err)
    }
  })
}

async function setPrefix(args, message) {
  if (args.length > 1) return message.channel.send(invalidCommandMessage);
  const prefix = args[0];
  const guildId = message.guild.id;
  configCache[guildId] = {
    ...configCache[guildId],
    prefix
  }

  await mongo().then(async mongoose => {
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
      )
    } finally {
      mongoose.connection.close();
    }
  })

  message.channel.send(`Prefix set to ${prefix}`);

}

function getTweetChannel(guildId) {
  return new Promise((res, rej) => {
    try {
      mongo().then(async mongoose => {
        try {
          const config = await ConfigSchema.findOne({ _id: guildId });
          if (config.tweetChannelId) {
            configCache[guildId] = {
              ...configCache[guildId],
              tweetChannelId: config.tweetChannelId
            }
            res(config.tweetChannelId);
          } else {
            configCache[guildId] = {
              ...configCache[guildId],
              tweetChannelId: 'empty'
            }
            res(false);
          }
        } finally {
          mongoose.connection.close();
        }
      })
    } catch (err) {
      rej(err);
    }
  })
}

async function setTweetChannel(args, message) {
  if (args.length > 0) return message.channel.send(invalidCommandMessage)
  const channelId = message.channel.id;
  const guildId = message.guild.id;

  configCache[guildId] = {
    ...configCache[guildId],
    tweetChannelId: channelId
  }

  await mongo().then(async mongoose => {
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
      )
    } finally {
      mongoose.connection.close();
    }
  })

  message.channel.send(`Every tweets will be send to this channel!`);
}

function getLiveStramChannel(guildId) {
  return new Promise((res, rej) => {
    try {
      mongo().then(async mongoose => {
        try {
          const config = await ConfigSchema.findOne({ _id: guildId });
          if (config.streamChannelId) {
            configCache[guildId] = {
              ...configCache[guildId],
              streamChannelId: config.streamChannelId
            }
            res(config.streamChannelId);
          } else {
            configCache[guildId] = {
              ...configCache[guildId],
              streamChannelId: 'empty'
            }
            res(false);
          }
        } finally {
          mongoose.connection.close();
        }
      })
    } catch (err) {
      rej(err);
    }
  })
}

async function setLivestreamChannel(args, message) {
  if (args.length > 0) return message.channel.send(invalidCommandMessage);

  const channelId = message.channel.id;
  const guildId = message.guild.id;

  configCache[guildId] = {
    ...configCache[guildId],
    streamChannelId: channelId
  }

  await mongo().then(async mongoose => {
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
      )
    } finally {
      mongoose.connection.close();
    }
  })

  message.channel.send(`Every livestream notification will be send to this channel!`);
}

function runLiveStreamCmd(message) {
  fetch('https://api.holotools.app/v1/live?max_upcoming_hours=48&hide_channel_desc=1')
    .then(res => res.json())
    .then(({ live }) => {
      const embed = new MessageEmbed();
      embed
        .setTitle('Currently Streaming')
        .setColor('#ff0000')
        .addFields(live.map(live => ({
          name: `**${live.channel.name}**`,
          value: `[${live.title}](https://youtube.com/watch?v=${live.yt_video_key})`
        })))
      message.channel.send(embed);
    })
}

function runUpcomingLiveStreamCmd(message) {
  fetch('https://api.holotools.app/v1/live?max_upcoming_hours=48&hide_channel_desc=1')
    .then(res => res.json())
    .then(({ upcoming }) => {
      upcoming.sort((a, b) => new Date(a.live_schedule) - new Date(b.live_schedule));

      const embed = new MessageEmbed();
      embed
        .setTitle('Upcoming Stream')
        .setColor('#ff0000')
        .addFields(upcoming.map(upcoming => ({
          name: `**${upcoming.channel.name}** ${moment(upcoming.live_schedule).endOf().fromNow()}`,
          value: `[${upcoming.title}](https://youtube.com/watch?v=${upcoming.yt_video_key})`
        })));
      message.channel.send(embed);
    })
}

app.get("/", (req, res) => {
  res.end('Nothing to see here')
});

app.listen(port, () => console.log(`App is running on ${port}`))
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
const PREFIX = "*";
const fetchApiInterval = 300000;

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
      console.log('fetched');
      for (let stream of currentlyStreaming.keys()) {
        const isExist = live.find(live => live.yt_video_key === stream);
        if (!isExist) currentlyStreaming.delete(stream);
      }

      live.forEach(live => {
        if (!currentlyStreaming.has(live.yt_video_key)) {
          currentlyStreaming.add(live.yt_video_key)
          const guild = client.guilds.cache.get('774885904443375626');
          const channel = guild.channels.cache.find(c => c.name === 'livestreams');
          channel.send(`**${live.channel.name}** is now live!`);
          channel.send(`https://youtube.com/watch?v=${live.yt_video_key}`)
        }
      });
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
  const guild = client.guilds.cache.get('774885904443375626');
  const channel = guild.channels.cache.find(c => c.name === 'tweets');
  data = data.data
  if (Object.keys(hololiveMemberIds).includes(data.user.screen_name)) {
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

client.on('message', message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;
  if (!message.guild) return;
  const [CMD_NAME, ...args] = message.content
    .trim()
    .substring(PREFIX.length)
    .split(/\s+/);
  switch (CMD_NAME) {
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
    default:
      message.channel.send('Invalid command');
  }
})

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
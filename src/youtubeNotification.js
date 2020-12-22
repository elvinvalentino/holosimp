const fetch = require('node-fetch');

const configCache = require('./configCache');
const { getLiveStramChannel } = require("./getLiveStramChannel");
const currentlyStreaming = new Set();

module.exports.setCurrentlyStreamingUser = function () {
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

module.exports.watchApi = function (client) {
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
            if (guild.id === client.guilds.cache.last().id) {
              currentlyStreaming.add(live.yt_video_key)
            }
            const channel = guild.channels.cache.get(channelId);
            channel.send(`**${live.channel.name}** is now live!\nhttps://youtube.com/watch?v=${live.yt_video_key}`);
          }
        })
      })
    })
}
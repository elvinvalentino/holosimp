const fetch = require('node-fetch');
const { MessageEmbed } = require('discord.js');

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
        })));
      message.channel.send(embed);
    });
}
exports.runLiveStreamCmd = runLiveStreamCmd;

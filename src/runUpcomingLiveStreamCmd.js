const fetch = require('node-fetch');
const moment = require('moment');
const { MessageEmbed } = require('discord.js');

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
    });
}
exports.runUpcomingLiveStreamCmd = runUpcomingLiveStreamCmd;

const { MessageEmbed } = require('discord.js');

function sendHelp(message) {
  const embed = new MessageEmbed();
  embed.setTitle('Help')
    .setDescription(`
      **setprefix** - change prefix
      **settweetchannel / stc** - set channel to send tweet
      **setlivestreamchannel / slc** - set channel to notify livestream
      **livesream / ls** - get curently streaming list
      **upcominglivestream / uls** - get upcoming stream list
    `);
  message.channel.send(embed);
}
exports.sendHelp = sendHelp;

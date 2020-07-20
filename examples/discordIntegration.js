/* eslint-disable import/no-extraneous-dependencies */
const Discord = require('discord.js');
const { writeFile } = require('fs').promises;
const Fnbrjs = require('..');

const discordBotToken = '';
const fortniteBotAuth = {
  authorizationCode: '',
  // deviceAuth: './deviceauth.json',

  /*
  Add the deviceauth line after you started the bot once.
  For the first start, get an authorization code at
  https://www.epicgames.com/id/logout?redirectUrl=https%3A//www.epicgames.com/id/login%3FredirectUrl%3Dhttps%253A%252F%252Fwww.epicgames.com%252Fid%252Fapi%252Fredirect%253FclientId%253D3446cd72694c4a4485d81b77adbb2141%2526responseType%253Dcode
  */
};

const bot = new Discord.Client();
const fnbot = new Fnbrjs.Client({ auth: fortniteBotAuth, debug: false });

(async () => {
  fnbot.on('deviceauth:created', (d) => writeFile('./deviceauth.json', JSON.stringify(d)));
  await Promise.all([bot.login(discordBotToken), fnbot.login()]);

  console.log(`Discord bot ready as ${bot.user.tag}`);
  console.log(`Fortnite bot ready as ${fnbot.user.displayName}`);

  bot.on('message', (msg) => {
    if (msg.content === 'ping') {
      msg.reply('Pong!');
    }
  });

  fnbot.on('friend:message', (msg) => {
    if (msg.content === 'ping') {
      msg.reply('Pong!');
    }
  });
})();

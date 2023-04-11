/* eslint-disable */
const { Client } = require('fnbr');

const client = new Client();

client.on('friend:message', (message) => {
  console.log(`Message from ${message.author.displayName}: ${message.content}`);
  if (message.content.toLowerCase().startsWith('ping')) {
    message.reply('Pong!');
  }
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.self.displayName}`);
});

client.login();

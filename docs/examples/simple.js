/* eslint-disable */
const { Client } = require('../../');

const client = new Client();

client.on('friend:message', (message) => {
  console.log(`Message from ${message.author.displayName}: ${message.content}`);
  if (message.content.toLowerCase().startsWith('ping')) {
    message.reply('Pong!');
  }
});

client.on('party:member:message', (message) => {
  console.log(`Party Message from ${message.author.displayName}: ${message.content}`);
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.self.displayName}`);
});

client.login();

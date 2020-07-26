/* eslint-disable */
const { Client } = require('fnbr');

const client = new Client({
  auth: {
    authorizationCode: '',
  },
});

client.on('friend:message', (friendMessage) => {
  console.log(`Message from ${friendMessage.friend.displayName}: ${friendMessage.content}`);
  if(friendMessage.content.toLowerCase().startsWith('ping')) {
    friendMessage.author.sendMessage('Pong!');
  }
});

(async () => {
  await client.login();
  console.log(`Logged on ${client.user.displayName}`);
})();

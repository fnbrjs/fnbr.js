<a href="https://fnbr.js.org"><img align="left" src="https://fnbr.js.org/static/logo-square.png" height=128 width=128 /></a>

[![CI Status](https://github.com/fnbrjs/fnbr.js/actions/workflows/node.js.yml/badge.svg)](https://github.com/fnbrjs/fnbr.js/actions/workflows/node.js.yml)
[![NPM Version](https://img.shields.io/npm/v/fnbr.svg)](https://npmjs.com/package/fnbr)
[![NPM Downloads](https://img.shields.io/npm/dm/fnbr.svg)](https://npmjs.com/package/fnbr)
[![MIT License](https://img.shields.io/npm/l/fnbr.svg)](https://github.com/fnbrjs/fnbr.js/blob/master/LICENSE)
[![Discord Server](https://discord.com/api/guilds/522121965952303105/widget.png)](https://discord.gg/u76QKTBRbf)

An object-oriented, stable, fast and actively maintained library to interact with Epic Games' Fortnite HTTP and XMPP services. Inspired by [discord.js](https://github.com/discordjs/discord.js) and [fortnitepy](https://github.com/Terbau/fortnitepy).

<br />
<hr />

<h2>Installation</h2>

```
npm install fnbr
```

<h2>Usage example</h2>
 
```javascript
const { Client } = require('fnbr');

const client = new Client({
  auth: {
    authorizationCode: '',
  },
});

client.on('friend:message', (msg) => {
  console.log(`Message from ${msg.author.displayName}: ${msg.content}`);
  if (msg.content.toLowerCase().startsWith('ping')) {
    msg.author.sendMessage('Pong!');
  }
});

client.login().then(() => {
  console.log(`Logged in as ${client.user.displayName}`);
});
```

<h2>Links</h2>

- [NPM](https://npmjs.com/package/fnbr)
- [Docs](https://fnbr.js.org)
- [Discord](https://discord.gg/u76QKTBRbf)

<h2>License</h2>

fnbr.js is available under the MIT license. Check [LICENSE](https://github.com/fnbrjs/fnbr.js/blob/master/LICENSE) if you want to fully read it.

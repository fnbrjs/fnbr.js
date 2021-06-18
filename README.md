<a href="https://fnbr.js.org"><img align="left" src="https://fnbr.js.org/static/logo-square.png" height=128 width=128 /></a>

[![CI Status](https://github.com/fnbrjs/fnbr.js/actions/workflows/node.js.yml/badge.svg)](https://github.com/fnbrjs/fnbr.js/actions/workflows/node.js.yml)
[![NPM Version](https://img.shields.io/npm/v/fnbr.svg)](https://npmjs.com/package/fnbr)
[![NPM Downloads](https://img.shields.io/npm/dm/fnbr.svg)](https://npmjs.com/package/fnbr)
[![MIT License](https://img.shields.io/npm/l/fnbr.svg)](https://github.com/fnbrjs/fnbr.js/blob/master/LICENSE)
[![Discord Server](https://discord.com/api/guilds/522121965952303105/widget.png)](https://discord.gg/u76QKTBRbf)

<br />

A library to interact with Epic Games' Fortnite HTTP and XMPP services. Object-oriented, stable, and fast. Inspired by [Discord.JS](https://github.com/discordjs/discord.js) and [fortnitepy](https://github.com/Terbau/fortnitepy), FNBR.JS is the only actively maintained Fortnite Node.JS Library.

<hr />

<h2 align=center>Installation</h2>

```
npm install fnbr
```

<h2 align=center>Usage</h2>
 
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

<h2 align=center>Links</h2>

- [FNBR.JS](https://npmjs.com/package/fnbr) ([source](https://github.com/fnbrjs/fnbr.js))
- [Documentation](https://fnbr.js.org) ([source](https://github.com/fnbrjs/docs))

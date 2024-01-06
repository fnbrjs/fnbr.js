<a href="https://fnbr.js.org"><img align="left" src="https://fnbr.js.org/static/logo-square.png" height=128 width=128 /></a>

[![CI Status](https://github.com/fnbrjs/fnbr.js/actions/workflows/ci.yml/badge.svg)](https://github.com/fnbrjs/fnbr.js/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/fnbr.svg)](https://npmjs.com/package/fnbr)
[![NPM Downloads](https://img.shields.io/npm/dm/fnbr.svg)](https://npmjs.com/package/fnbr)
[![MIT License](https://img.shields.io/npm/l/fnbr.svg)](https://github.com/fnbrjs/fnbr.js/blob/master/LICENSE)
[![Discord Server](https://discord.com/api/guilds/522121965952303105/widget.png)](https://discord.gg/j5xZ54RJvR)

An object-oriented, stable, fast and actively maintained library to interact with Epic Games' Fortnite HTTP and XMPP services. Inspired by [discord.js](https://github.com/discordjs/discord.js), [fortnitepy](https://github.com/Terbau/fortnitepy) and [epicgames-fortnite-client](https://github.com/SzymonLisowiec/node-epicgames-fortnite-client).

<br />
<hr />

<h2>Installation</h2>

```
npm install fnbr
```

<h2>Usage example</h2>
 
```javascript
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
```

<h2>Links</h2>

- [NPM](https://npmjs.com/package/fnbr)
- [Docs](https://fnbr.js.org)
- [Discord](https://discord.gg/j5xZ54RJvR)

<h2>License</h2>
MIT License

Copyright (c) 2020-2024 Nils S.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

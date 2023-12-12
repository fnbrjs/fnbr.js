<div align="center">
  <br />
  <p>
    <a href="https://fnbr.js.org/"><img src="https://fnbr.js.org/static/logo.png" width="546" alt="fnbr.js" id="fnbrjs-logo" style="filter: drop-shadow(0 3px 4px #333);" /></a>
  </p>
  <p>
    <a href="https://nodei.co/npm/fnbr/"><img src="https://nodei.co/npm/fnbr.png?downloads=true&stars=true" alt="NPM info" /></a>
  </p>
</div>

# fnbr.js
A library to interact with Fortnite's HTTP and XMPP services

## Installation
```
npm i fnbr
```

## Example
Example: 
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

## Help
Feel free to join [this Discord server](https://discord.gg/j5xZ54RJvR)

## License
MIT License

Copyright (c) 2020-2023 Nils S.

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

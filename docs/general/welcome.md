<div align="center">
  <br />
  <p>
    <a href="https://fnbr.js.org/"><img src="/static/logo.svg" width="546" alt="fnbr.js" id="fnbrjs-logo" style="filter: drop-shadow(0 3px 4px #333);" /></a>
  </p>
  <p>
    <a href="https://nodei.co/npm/fnbr/"><img src="https://nodei.co/npm/fnbr.png?downloads=true&stars=true" alt="NPM info" /></a>
  </p>
</div>

# fnbr.js
A library to interact with fortnites http and xmpp services

## Installation
```
npm i fnbr
```

## Example
Example: 
```javascript
const { Client } = require('fnbr');

const client = new Client({
  auth: {
    authorizationCode: '',
  },
});

client.on('friend:message', (friendMessage) => {
  console.log(`Message from ${friendMessage.friend.displayName}: ${friendMessage.content}`);
  if (friendMessage.content.toLowerCase().startsWith('ping')) {
    friendMessage.author.sendMessage('Pong!');
  }
});

(async () => {
  await client.login();
  console.log(`Logged in as ${client.user.displayName}`);
})();
```

## Help
Feel free to join [this Discord server](https://discord.gg/HsUFr5f)

## License
MIT License

Copyright (c) 2020 Nils S.

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

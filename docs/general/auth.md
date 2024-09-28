# Authentication
fnbr.js does not support email & password as an authentication method as you get a captcha in 9 out of 10 cases.

## So whats the preferred way of authenticating?
You should use an authorization code for the first time you login and generate a device auth.

**Example:**
How does that look like code wise?
```javascript
const { readFile, writeFile } = require('fs').promises;
const { Client } = require('fnbr');

(async () => {
  let auth;
  try {
    auth = { deviceAuth: JSON.parse(await readFile('./deviceAuth.json')) };
  } catch (e) {
    auth = { authorizationCode: async () => Client.consoleQuestion('Please enter an authorization code: ') };
  }

  const client = new Client({ auth });

  client.on('deviceauth:created', (da) => writeFile('./deviceAuth.json', JSON.stringify(da, null, 2)));

  await client.login();
  console.log(`Logged in as ${client.user.self.displayName}`);
})();
```

## How do I obtain an authorization code?
You can use [this link](https://www.epicgames.com/id/logout?redirectUrl=https%3A//www.epicgames.com/id/login%3FredirectUrl%3Dhttps%253A%252F%252Fwww.epicgames.com%252Fid%252Fapi%252Fredirect%253FclientId%253D3f69e56c7649492c8cc29f1af08a8a12%2526responseType%253Dcode) and copy the 32 character code! An authorization code can only be used once and expires after 300 seconds. Thats why you should generate a device auth with it.

## How does a device auth work?
A device auth doesn't expire and it consists of a accountId, deviceId and secret. You can create as many device auths for an account as you want.

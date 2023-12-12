/* eslint-disable */
const { readFile, writeFile } = require('fs').promises;
const { Client } = require('fnbr');

(async () => {
  let auth;
  try {
    auth = { launcherRefreshToken: await readFile('./refreshToken', 'utf8') };
  } catch (e) {
    auth = { authorizationCode: async () => Client.consoleQuestion('Please enter an authorization code: ') };
  }

  const client = new Client({ auth });

  client.on('refreshtoken:created', (refreshTokenData) => writeFile('./refreshToken', refreshTokenData.token));

  await client.login();
  console.log(`Logged in as ${client.user.self.displayName}`);
})();

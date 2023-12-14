/* eslint-disable */
const { readFile, writeFile } = require('fs').promises;
const { default: axios, AxiosError } = require('axios');
const { Client } = require('fnbr');

// Your fortniteapi.io api key. Obtain one at https://dashboard.fortniteapi.io/
const APIKEY = '';

const getCosmeticPath = (path) => path
  .replace(/^FortniteGame\/Content/, '/Game')
  .replace(/FortniteGame\/Plugins\/GameFeatures\/BRCosmetics\/Content/, '/BRCosmetics')
  .split('/')
  .slice(0, -1)
  .join('/');

const fetchCosmetic = async (name, type) => {
  try {
    const cosmetic = await axios.get({
      url: `https://fortniteapi.io/v2/items/list?name=${encodeURI(name)}&type.id=${type}`,
      headers: { Authorization: APIKEY },
    });
    return cosmetic.data.items[0];
  } catch (err) {
    if (!(err instanceof AxiosError) || err.status !== 404) {
      throw err;
    }

    return undefined;
  }
};

const handleCommand = async (m) => {
  if (!m.content.startsWith('!')) return;
  const args = m.content.slice(1).split(' ');
  const command = args.shift().toLowerCase();

  if (command === 'outfit' || command === 'skin') {
    const skin = await fetchCosmetic(args.join(' '), 'outfit');
    if (!skin) {
      await m.reply(`The skin ${args.join(' ')} wasn't found!`);
      return;
    }

    await m.client.party.me.setOutfit(skin.id, undefined, undefined);
    await m.reply(`Set the skin to ${skin.name}!`);
  } else if (command === 'emote' || command === 'dance') {
    const emote = await fetchCosmetic(args.join(' '), 'emote');
    if (!emote) {
      await m.reply(`The emote ${args.join(' ')} wasn't found!`);
      return;
    }

    await m.client.party.me.setEmote(emote.id, getCosmeticPath(emote.path));
    await m.reply(`Set the emote to ${emote.name}!`);
  }
};

(async () => {
  let auth;
  try {
    auth = { deviceAuth: JSON.parse(await readFile('./deviceAuth.json')) };
  } catch (e) {
    auth = { authorizationCode: async () => Client.consoleQuestion('Please enter an authorization code: ') };
  }

  const client = new Client({ auth });

  client.on('deviceauth:created', (da) => writeFile('./deviceAuth.json', JSON.stringify(da, null, 2)));
  client.on('party:member:message', handleCommand);
  client.on('friend:message', handleCommand);

  await client.login();
  console.log(`Logged in as ${client.user.self.displayName}`);
})();

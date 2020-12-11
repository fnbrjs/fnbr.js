/* eslint-disable no-restricted-syntax */
/* eslint-disable no-undef */
const assert = require('assert');
const { Client, Enums } = require('.');
const Party = require('./src/Structures/Party');

describe('Client startup', () => {
  it('should be constructed', () => {
    client = new Client({
      auth: {
        deviceAuth: JSON.parse(process.env.DEVICEAUTH),
      },
      debug: false,
    });
  });
  it('should login', async function login() {
    this.timeout(15000);
    await client.login();
  });
  it('should be connected to xmpp', () => {
    assert.strictEqual(client.Xmpp.stream.sessionStarted, true, 'Client must be connected to xmpp');
  });
});

describe('Client cache', () => {
  it('should exist', () => {
    assert.strictEqual(client.friends.size > 0, true, 'Client friends cache must be greater than 0');
  });
});

describe('Client gamemode functions', () => {
  it('should fetch battleroyale, creative and savetheworld news', async () => {
    const promises = [];
    for (const mode of Object.values(Enums.Gamemode)) {
      promises.push(client.getNews(mode, Enums.Language.ENGLISH));
    }
    (await Promise.all(promises)).forEach((news) => {
      assert.strictEqual(!!news, true, 'All news must be existing');
      assert.strictEqual(!news.some((msg) => !msg), true, 'All news messages must be existing');
    });
  });
  it('should fetch battle royale stats', async () => {
    const stats = await client.getBRStats('This Nils');
    assert.strictEqual(Object.keys(stats.stats).length > 50, true, 'Stats must have more than 50 keys');
  });
  it('should fetch a creator code', async () => {
    const code = await client.getCreatorCode('Ninja');
    assert.strictEqual(typeof code === 'object', true, 'Code must be typeof object');
    assert.strictEqual(code.owner.id, '4735ce9132924caf8a5b17789b40f79c', 'Code must be owned by \'4735ce9132924caf8a5b17789b40f79c\'');
  });
  it('should fetch the battle royale shop', async () => {
    const shop = await client.getBRStore(Enums.Language.ENGLISH);
    assert.strictEqual(typeof shop === 'object' && Object.keys(shop).length > 0, true, 'Shop must be typeof object and have at least 1 key');
    assert.strictEqual(typeof shop.storefronts === 'object' && shop.storefronts.length > 0, true, 'Shop storefronts must be typeof object and have at least 1 key');
  });
  it('should fetch battle royale event flags', async () => {
    const flags = await client.getBREventFlags(Enums.Language.ENGLISH);
    assert.strictEqual(typeof flags === 'object' && Object.keys(flags).length > 0, true, 'Flags must be typeof object and have at least 1 key');
    assert.strictEqual(typeof flags.channels === 'object' && Object.keys(flags.channels).length > 0, true, 'Flags channels must be typeof object and have at least 1 key');
  });
  it('should fetch the fortnite server status', async () => {
    const status = await client.getFortniteServerStatus();
    assert.strictEqual(typeof status === 'object' && Object.keys(status).length > 0, true, 'Fortnite server status must be typeof object and have at least 1 key');
    assert.strictEqual(status.serviceInstanceId, 'fortnite', 'Fortnite server status instace id must be \'fortnite\'');
  });
  it('should fetch epicgames server status', async () => {
    const status = await client.getServerStatus();
    assert.strictEqual(typeof status === 'object' && Object.keys(status).length > 0, true, 'Server status must be typeof object and have at least 1 key');
    assert.strictEqual(typeof status.components, 'object', 'Server status components must be typeof object');
  });
  it('should fetch battle royale tournaments', async () => {
    const tournaments = await client.getTournaments();
    assert.strictEqual(Array.isArray(tournaments), true, 'Tournaments must be an array');
    assert.strictEqual(tournaments.length > 0, true, 'Tournaments must consist of at least 1 entry');
  });
  it('should fetch a battle royale tournament window', async () => {
    const window = await client.getTournamentWindow('epicgames_S13_FNCS_EU_Qualifier4_PC', 'S13_FNCS_EU_Qualifier4_PC_Round1');
    assert.strictEqual(typeof window === 'object' && Object.keys(window).length > 0, true, 'Tournament window must be typeof object and have at least 1 key');
  });
  it('should fetch battle royale radio stations', async () => {
    const stations = await client.getRadioStations();
    assert.strictEqual(Array.isArray(stations), true, 'Radio stations must be typeof array');
  });
  it('should fetch a battle royale radio stream', async () => {
    const stream = await client.getRadioStream('BXrDueZkosvNvxtx', Enums.Language.ENGLISH);
    assert.strictEqual(Buffer.isBuffer(stream), true, 'Radio stream must be typeof buffer');
  });
  it('should fetch a battle royale video blurl stream', async () => {
    const stream = await client.getBlurlVideo('LqUHUJChvPyJJfrU', Enums.Language.ENGLISH, '1920x1080');
    assert.strictEqual(Buffer.isBuffer(stream), true, 'Video stream must be typeof buffer');
  });
  it('should download a fortnite replay', async () => {
    const replay = await client.getTournamentReplay('23a9c72d2d564e4d9a696b56797a802f', []);
    assert.strictEqual(typeof replay, 'object', 'Replay must be typeof object');
  });
});

describe('Client party functions', () => {
  it('should be in a party', () => {
    assert.strictEqual(typeof client.party, 'object', 'Client party must be typeof object');
    assert.strictEqual(typeof client.party.me, 'object', 'Client party member must be typeof object');
  });
  it('should change its cosmetics', async () => {
    await client.party.me.setOutfit('CID_028_Athena_Commando_F');
  });
  it('should leave its party', async () => {
    await client.party.leave(false);
  });
  it('should create a new party', async () => {
    await Party.Create(client);
    assert.strictEqual(typeof client.party, 'object', 'Client party must be typeof object');
    assert.strictEqual(typeof client.party.me, 'object', 'Client party member must be typeof object');
  });
});

describe('Client shutdown', () => {
  it('should logout', async function logout() {
    this.timeout(15000);
    await client.logout();
  });
});

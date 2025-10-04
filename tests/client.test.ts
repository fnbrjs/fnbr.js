/* eslint-env jest */
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  afterAll,
  beforeAll,
  describe, expect, test,
} from '@jest/globals';
import { Client, UserNotFoundError } from '..';

const client = new Client({
  auth: {
    deviceAuth: JSON.parse(process.env.DEVICE_AUTH!),
    killOtherTokens: false,
    authClient: 'fortniteAndroidGameClient',
  },
});

beforeAll(async () => {
  await client.login();
});

afterAll(async () => {
  await client.logout();
});

describe('client methods', () => {
  test('logs in', () => {
    expect(client.isReady).toBe(true);

    expect(client.friend.list.size).toBeGreaterThan(0);

    expect(client.user.self).toBeDefined();
    expect(client.user.self?.displayName).toBeDefined();

    expect(client.party).toBeDefined();
    expect(client.party?.me).toBeDefined();

    expect(client.xmpp.isConnected).toBe(true);
    expect(client.xmpp.JID).toBeDefined();
  });

  test('fetches fortnite server status', async () => {
    const status = await client.getFortniteServerStatus();
    expect(status).toBeDefined();
    expect(typeof status.status).toBe('string');
    expect(typeof status.message).toBe('string');
  });

  test('fetches epicgames server status', async () => {
    const status = await client.getEpicgamesServerStatus();
    expect(status).toBeDefined();
    expect(typeof status.statusIndicator).toBe('string');
    expect(typeof status.statusDescription).toBe('string');
  });

  test('fetches storefronts', async () => {
    const storefronts = await client.getStorefronts();
    expect(storefronts).toBeDefined();
    expect(storefronts.length).toBeGreaterThan(0);
  });

  test('fetches br news', async () => {
    const news = await client.getBRNews();
    expect(news).toBeDefined();
  });

  test('fetches creator code', async () => {
    const creatorCode = await client.getCreatorCode('ninja');
    expect(creatorCode).toBeDefined();
    expect(creatorCode.code).toBe('ninja');
    expect(creatorCode.owner).toBeDefined();
  });

  test('fetches creative island', async () => {
    const island = await client.getCreativeIsland('8064-7152-2934');
    expect(island).toBeDefined();
    expect(island.mnemonic).toBe('8064-7152-2934');
    expect(island.metadata.title).toBeDefined();
  });

  test('fetches br stats', async () => {
    const stats = await client.getBRStats(client.user.self!.displayName!);
    expect(stats).toBeDefined();
    expect(stats.user.id).toBe(client.user.self!.id);
    expect(stats.stats).toBeDefined();
  }, 20000);

  test('fetches radio stations', async () => {
    const stations = await client.getRadioStations();
    expect(stations).toBeDefined();
    expect(stations.length).toBeGreaterThan(0);
  });

  test('fetches br event flags', async () => {
    const flags = await client.getBREventFlags();
    expect(flags).toBeDefined();
  });

  test('fetches br account level', async () => {
    const level = await client.getBRAccountLevel(client.user.self!.id, 20);
    expect(level).toBeDefined();
    expect(level[0].user.id).toBe(client.user.self!.id);
    expect(typeof level[0].level.level).toBe('number');
  }, 20000);

  test('fetches storefront keychain', async () => {
    const keychain = await client.getStorefrontKeychain();
    expect(keychain).toBeDefined();
    expect(keychain.length).toBeGreaterThan(0);
  });

  // Currently not working
  // test('fetches creative discovery panels', async () => {
  //   const panels = await client.getCreativeDiscoveryPanels('20.00', 'EU');
  //   expect(panels).toBeDefined();
  // }, 20000);

  test('waits until ready', async () => {
    await client.waitUntilReady();
    expect(client.isReady).toBe(true);
  });

  test('updates caches', async () => {
    await client.updateCaches();
    expect(client.friend.list.size).toBeGreaterThan(0);
  }, 20000);

  test('sets and resets status', async () => {
    const status = 'testing status';
    client.setStatus(status);
    expect(client.config.defaultStatus).toBe(status);
    await client.resetStatus();
    expect(client.config.defaultStatus).toBeUndefined();
  });

  test('creates and leaves a party', async () => {
    await client.leaveParty(false);
    expect(client.party).toBeUndefined();
    await client.createParty();
    expect(client.party).toBeDefined();
    expect(client.party?.me).toBeDefined();
  }, 20000);
});

describe('user manager methods', () => {
  test('fetches user', async () => {
    const user = await client.user.fetch('This_Nils');
    expect(user).toBeDefined();
    expect(user.displayName).toBe('This_Nils');
  });

  test('searches user', async () => {
    const users = await client.user.search('This_N');
    expect(users).toBeDefined();
    expect(users.length).toBeGreaterThan(0);
    expect(users[0].displayName).toBeDefined();
  });

  test('fetches avatar', async () => {
    const avatar = await client.user.fetchAvatar('This_Nils');
    expect(avatar).toBeDefined();
    expect(avatar.id).toBeDefined();
  });

  test('fetches global profile', async () => {
    const profile = await client.user.fetchGlobalProfile('This_Nils');
    expect(profile).toBeDefined();
    expect(profile).toHaveProperty('playRegion');
  });

  test('blocking non-existent user fails', async () => {
    await expect(client.user.block('a-user-that-does-not-exist-for-sure'))
      .rejects.toThrow(UserNotFoundError);
  });

  test('unblocking non-existent user fails', async () => {
    await expect(client.user.unblock('a-user-that-is-not-blocked'))
      .rejects.toThrow(UserNotFoundError);
  });
});

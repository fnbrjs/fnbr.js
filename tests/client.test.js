/* eslint-env jest */
const { Client } = require('../dist');

/**
 * @type {Client}
 */
let client;

beforeEach(() => {
  client = new Client();
});

describe('Client Startup', () => {
  it('successfully initializes without config', () => {
    expect(client).toBeInstanceOf(Client);

    expect(client.auth).toBeDefined();
    expect(client.xmpp).toBeDefined();
    expect(client.http).toBeDefined();
    expect(client.user).toBeDefined();
    expect(client.friend).toBeDefined();

    expect(client.config).toBeDefined();
    expect(client.isReady).toBe(false);
    expect(client.friend.list.size).toBe(0);

    expect(client.partyLock.isLocked).toBe(false);
  });
});

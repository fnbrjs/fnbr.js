/* eslint-env jest */
const { Client } = require('../dist');

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

    expect(client.config).toBeDefined();
    expect(client.user).toBeUndefined();
    expect(client.isReady).toBe(false);
    expect(client.friends.size).toBe(0);

    expect(client.reauthLock.isLocked).toBe(false);
    expect(client.partyLock.isLocked).toBe(false);
  });
});

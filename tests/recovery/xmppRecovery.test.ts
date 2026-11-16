import { describe, expect, test } from '@jest/globals';
import {
  advance, dropConnection, expectLoggedOut, makeHarness, setupRecoveryFixtures, startAndResetRequests,
  stompSockets, xmppOutcomes, xmppSockets,
} from './fixtures';

setupRecoveryFixtures();

describe('XMPP recovery', () => {
  test('restores status, friend caches and the existing party after sudden loss', async () => {
    const h = makeHarness({ config: { fetchFriends: true, defaultStatus: 'Recovered status', defaultOnlineType: 'away' } });
    await startAndResetRequests(h);
    h.client.friend.list.clear();
    h.client.user.cache.clear();

    dropConnection('xmpp');
    expect(h.client.xmpp.isConnected).toBe(false);
    expect(h.client.stomp.isConnected).toBe(true);
    await advance(9);
    expect(xmppSockets).toHaveLength(1);
    await advance(1);

    expect(h.client.xmpp.isConnected).toBe(true);
    expect(h.requestsOf('presence')).toEqual(expect.arrayContaining([
      expect.objectContaining({
        data: expect.objectContaining({ status: 'away', activity: { value: 'Recovered status' } }),
      }),
    ]));
    expect(h.requestsOf('friends')).toHaveLength(1);
    expect(h.client.friend.list.get('friend-1')?.displayName).toBe('Recovered Friend');
    expect(h.client.user.cache.get('friend-1')?.displayName).toBe('Recovered Friend');
    expect(h.client.party?.eosId).toBe(h.partyId);
    expect(h.requestsOf('party-state')).toHaveLength(1);
    expect(h.requestsOf('party-rebind')).toHaveLength(1);
    expect(h.requestsOf('party-create')).toHaveLength(0);
  });

  test('retains the existing cache without refreshing when fetchFriends is false', async () => {
    const h = makeHarness();
    await startAndResetRequests(h);
    await h.client.updateCaches();
    const friend = h.client.friend.list.get('friend-1');
    expect(friend?.displayName).toBe('Recovered Friend');
    h.requests.length = 0;

    dropConnection('xmpp');
    await advance(10);

    expect(h.client.xmpp.isConnected).toBe(true);
    expect(h.requestsOf('friends')).toHaveLength(0);
    expect(h.client.friend.list.get('friend-1')).toBe(friend);
    expect(h.client.party?.eosId).toBe(h.partyId);
    expect(h.requestsOf('party-rebind')).toHaveLength(1);
  });

  test.each(['error', 'close', 'timeout'] as const)('%s during a recovery handshake consumes an attempt', async (outcome) => {
    const h = makeHarness({ party: false, config: { xmppMaxConnectionRetries: 2 } });
    await startAndResetRequests(h);
    xmppOutcomes.push(outcome, 'success');
    dropConnection('xmpp');
    await advance(10);
    expect(xmppSockets).toHaveLength(2);
    if (outcome === 'timeout') {
      expect(h.client.xmpp.isConnected).toBe(false);
      await advance(5);
    }
    expect(h.client.xmpp.isConnected).toBe(false);
    await advance(19);
    expect(xmppSockets).toHaveLength(2);
    await advance(1);

    expect(xmppSockets).toHaveLength(3);
    expect(h.client.xmpp.isConnected).toBe(true);
    expect(h.disconnected).not.toHaveBeenCalled();
  });

  test.each([
    { route: 'presence', fetchFriends: false },
    { route: 'friends', fetchFriends: true },
    { route: 'party-rebind', fetchFriends: false },
  ] as const)('failed $route restoration consumes an attempt', async ({ route, fetchFriends }) => {
    const h = makeHarness({ config: { fetchFriends, xmppMaxConnectionRetries: 2 } });
    await startAndResetRequests(h);
    h.failNext(route);
    dropConnection('xmpp');
    await advance(10);

    expect(xmppSockets).toHaveLength(2);
    expect(h.client.xmpp.isConnected).toBe(false);
    expect(h.requestsOf(route)).toHaveLength(1);
    await advance(19);
    expect(xmppSockets).toHaveLength(2);
    await advance(1);

    expect(xmppSockets).toHaveLength(3);
    expect(h.client.xmpp.isConnected).toBe(true);
    expect(h.requestsOf(route)).toHaveLength(route === 'presence' ? 3 : 2);
    expect(h.client.party?.eosId).toBe(h.partyId);
    expect(h.disconnected).not.toHaveBeenCalled();
  });

  test.each([
    { name: 'configured', backoff: [7, 13], expected: [7, 13, 13, 13, 13] },
    {
      name: 'ADR default',
      backoff: [5000, 15000, 60000, 600000],
      expected: [5000, 15000, 60000, 600000, 600000],
    },
  ])('uses $name backoff and repeats its final delay', async ({ backoff, expected }) => {
    const h = makeHarness({
      party: false,
      config: { xmppConnectionRetryBackoff: backoff, xmppMaxConnectionRetries: expected.length },
    });
    await startAndResetRequests(h);
    xmppOutcomes.push('error', 'error', 'error', 'error', 'success');
    dropConnection('xmpp');

    for (const [attempt, delay] of expected.entries()) {
      await advance(delay - 1);
      expect(xmppSockets).toHaveLength(attempt + 1);
      await advance(1);
      expect(xmppSockets).toHaveLength(attempt + 2);
    }
    expect(h.client.xmpp.isConnected).toBe(true);
    expect(h.disconnected).not.toHaveBeenCalled();
  });

  test('a successful recovery resets both the delay and the retry budget', async () => {
    const h = makeHarness({ party: false, config: { xmppMaxConnectionRetries: 2 } });
    await startAndResetRequests(h);

    for (let cycle = 0; cycle < 2; cycle += 1) {
      xmppOutcomes.push('error', 'success');
      dropConnection('xmpp');
      await advance(9);
      expect(xmppSockets).toHaveLength(1 + cycle * 2);
      await advance(1);
      expect(xmppSockets).toHaveLength(2 + cycle * 2);
      await advance(19);
      expect(xmppSockets).toHaveLength(2 + cycle * 2);
      await advance(1);
      expect(xmppSockets).toHaveLength(3 + cycle * 2);
      expect(h.client.xmpp.isConnected).toBe(true);
    }
    expect(h.disconnected).not.toHaveBeenCalled();
  });

  test('exhaustion logs out both transports instead of scheduling another attempt', async () => {
    const h = makeHarness();
    await startAndResetRequests(h);
    xmppOutcomes.push('error', 'close', 'timeout');
    dropConnection('xmpp');
    await advance(10);
    await advance(20);
    await advance(30);
    expect(xmppSockets).toHaveLength(4);
    expect(h.disconnected).not.toHaveBeenCalled();
    await advance(5);

    expect(h.disconnected).toHaveBeenCalledTimes(1);
    expectLoggedOut(h.client);
    expect(h.requestsOf('revoke').length).toBeGreaterThan(0);
    await advance(1000);
    expect(xmppSockets).toHaveLength(4);
    expect(stompSockets).toHaveLength(1);
    expect(h.disconnected).toHaveBeenCalledTimes(1);
  });

  test.each(['disconnect', 'logout'] as const)('%s during backoff cancels recovery and allows a later connection', async (action) => {
    const h = makeHarness({ party: false });
    await startAndResetRequests(h);
    dropConnection('xmpp');
    await advance(9);
    if (action === 'logout') await h.client.logout();
    else h.client.xmpp.disconnect();
    await advance(100);

    expect(xmppSockets).toHaveLength(1);
    expect(h.client.xmpp.isConnected).toBe(false);
    expect(h.client.stomp.isConnected).toBe(action === 'disconnect');
    expect(h.disconnected).toHaveBeenCalledTimes(action === 'logout' ? 1 : 0);

    const connection = action === 'logout' ? h.client.login() : h.client.xmpp.connect();
    await advance(0);
    await connection;
    expect(xmppSockets).toHaveLength(2);
    expect(h.client.xmpp.isConnected).toBe(true);
    expect(h.client.stomp.isConnected).toBe(true);
  });

  test.each(['disconnect', 'logout'] as const)('%s rejects a pending public connect and cancels handshake recovery', async (action) => {
    const h = makeHarness({ party: false });
    await startAndResetRequests(h);
    xmppOutcomes.push('timeout');
    dropConnection('xmpp');
    await advance(10);
    const connection = h.client.xmpp.connect();
    const rejected = expect(connection).rejects.toThrow();
    if (action === 'logout') await h.client.logout();
    else h.client.xmpp.disconnect();
    await rejected;
    await advance(100);

    expect(xmppSockets).toHaveLength(2);
    expect(h.client.xmpp.isConnected).toBe(false);
    expect(h.client.stomp.isConnected).toBe(action === 'disconnect');
    expect(h.disconnected).toHaveBeenCalledTimes(action === 'logout' ? 1 : 0);

    const next = action === 'logout' ? h.client.login() : h.client.xmpp.connect();
    await advance(0);
    await next;
    expect(xmppSockets).toHaveLength(3);
    expect(h.client.xmpp.isConnected).toBe(true);
    expect(h.client.stomp.isConnected).toBe(true);
  });

  test('socket loss while party restoration completes cannot mark recovery successful', async () => {
    const h = makeHarness({ config: { xmppMaxConnectionRetries: 2 } });
    await startAndResetRequests(h);
    const held = h.holdNext('party-rebind');
    const restoring = h.nextRequest('party-rebind');
    dropConnection('xmpp');
    await advance(10);
    await restoring;
    expect(xmppSockets).toHaveLength(2);
    expect(h.client.xmpp.isConnected).toBe(true);

    dropConnection('xmpp');
    held.resolve();
    await advance(0);
    expect(h.client.xmpp.isConnected).toBe(false);
    await advance(19);
    expect(xmppSockets).toHaveLength(2);
    await advance(1);

    expect(xmppSockets).toHaveLength(3);
    expect(h.client.xmpp.isConnected).toBe(true);
    expect(h.requestsOf('party-rebind')).toHaveLength(2);
    expect(h.client.party?.eosId).toBe(h.partyId);
    expect(h.disconnected).not.toHaveBeenCalled();
  });
});

import { describe, expect, jest, test } from '@jest/globals';
import EpicgamesAPIError from '../../src/exceptions/EpicgamesAPIError';
import {
  advance, dropConnection, expectLoggedOut, makeHarness, setupRecoveryFixtures, startAndResetRequests,
  stompOutcomes, stompSockets,
} from './fixtures';

setupRecoveryFixtures();

describe('STOMP recovery', () => {
  test.each([
    'error', 'close', 'timeout', 'eos-error', 'stomp-error', 'missing-ids',
  ] as const)('%s during recovery consumes an attempt and does not stop retries', async (outcome) => {
    const h = makeHarness({ party: false, config: { stompMaxConnectionRetries: 2 } });
    await startAndResetRequests(h);
    stompOutcomes.push(outcome, 'success');
    dropConnection('stomp');
    await advance(10);
    expect(stompSockets).toHaveLength(2);
    if (outcome === 'timeout') await advance(5);
    expect(h.client.stomp.publicConnectionId).toBeUndefined();
    await advance(19);
    expect(stompSockets).toHaveLength(2);
    await advance(1);

    expect(stompSockets).toHaveLength(3);
    expect(h.client.stomp.isConnected).toBe(true);
    expect(h.client.stomp.publicConnectionId).toBeDefined();
    expect(h.disconnected).not.toHaveBeenCalled();
    expect(h.ready).toHaveBeenCalledTimes(1);
  });

  test('survives two failed attempts and resets the retry budget after recovery', async () => {
    const h = makeHarness();
    await startAndResetRequests(h);

    for (let outage = 0; outage < 2; outage += 1) {
      const before = stompSockets.length;
      const previousId = h.client.stomp.publicConnectionId;
      stompOutcomes.push('error', 'close');
      dropConnection('stomp');

      for (const [attempt, delay] of [10, 20, 30].entries()) {
        await advance(delay - 1);
        expect(stompSockets).toHaveLength(before + attempt);
        await advance(1);
        expect(stompSockets).toHaveLength(before + attempt + 1);
      }

      expect(h.client.stomp.isConnected).toBe(true);
      expect(h.client.stomp.publicConnectionId).toBeTruthy();
      expect(h.client.stomp.publicConnectionId).not.toBe(previousId);
      expect(h.client.party?.eosId).toBe(h.partyId);
      expect(h.requestsOf('party-rebind').at(-1)?.data).toEqual({
        connection_id: h.client.stomp.publicConnectionId,
        yield_leadership: false,
      });
      expect(h.disconnected).not.toHaveBeenCalled();
    }
    expect(h.requestsOf('party-rebind')).toHaveLength(2);
    expect(h.requestsOf('party-create')).toHaveLength(0);
  });

  test.each([
    'error', 'close', 'timeout', 'eos-error', 'stomp-error', 'missing-ids',
  ] as const)('rejects a public connect on %s and permits a later connection', async (outcome) => {
    const h = makeHarness({ party: false });
    await startAndResetRequests(h);
    const before = stompSockets.length;
    stompOutcomes.push(outcome);
    const connecting = h.client.stomp.connect();
    const rejected = expect(connecting).rejects.toThrow();
    await advance(5);
    await rejected;

    expect(stompSockets).toHaveLength(before + 1);
    expect(h.client.stomp.isConnected).toBe(false);
    expect(h.client.stomp.connectionId).toBeUndefined();
    expect(h.client.stomp.publicConnectionId).toBeUndefined();
    expect(h.client.stomp.privateConnectionId).toBeUndefined();
    await advance(100);
    expect(stompSockets).toHaveLength(before + 1);

    await h.client.stomp.connect();
    expect(stompSockets).toHaveLength(before + 2);
    expect(h.client.stomp.isConnected).toBe(true);
    expect(h.client.stomp.publicConnectionId).toBeTruthy();
    expect(h.client.stomp.privateConnectionId).toBeTruthy();
  });

  test.each([
    { label: 'ADR delays', backoff: [5000, 15000, 60000, 600000], attempts: 4 },
    { label: 'repeated final delay', backoff: [7, 11], attempts: 4 },
    { label: 'zero retry budget', backoff: [7], attempts: 0 },
  ])('honors $label and logs out exactly at exhaustion', async ({ backoff, attempts }) => {
    const h = makeHarness({
      party: false,
      config: { stompConnectionRetryBackoff: backoff, stompMaxConnectionRetries: attempts },
    });
    await startAndResetRequests(h);
    const before = stompSockets.length;
    for (let attempt = 0; attempt < attempts; attempt += 1) stompOutcomes.push('error');
    dropConnection('stomp');

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const delay = backoff[Math.min(attempt, backoff.length - 1)];
      await advance(delay - 1);
      expect(stompSockets).toHaveLength(before + attempt);
      expect(h.disconnected).not.toHaveBeenCalled();
      await advance(1);
      expect(stompSockets).toHaveLength(before + attempt + 1);
    }
    await advance(0);
    expect(h.disconnected).toHaveBeenCalledTimes(1);
    expectLoggedOut(h.client);
    expect(h.requestsOf('revoke').length).toBeGreaterThan(0);
    await advance(backoff.at(-1)! + 1);
    expect(stompSockets).toHaveLength(before + attempts);
    expect(h.disconnected).toHaveBeenCalledTimes(1);
  });

  test.each(['disconnect', 'logout'] as const)('%s cancels a scheduled retry and allows a later connection', async (operation) => {
    const h = makeHarness({ party: false });
    await startAndResetRequests(h);
    const before = stompSockets.length;
    dropConnection('stomp');
    if (operation === 'logout') await h.client.logout();
    else h.client.stomp.disconnect();

    await advance(100);
    expect(stompSockets).toHaveLength(before);
    expect(h.client.stomp.isConnected).toBe(false);
    expect(h.client.stomp.publicConnectionId).toBeUndefined();
    if (operation === 'logout') await h.client.login();
    else await h.client.stomp.connect();
    expect(stompSockets).toHaveLength(before + 1);
    expect(h.client.stomp.isConnected).toBe(true);
    await advance(100);
    expect(stompSockets).toHaveLength(before + 1);
  });

  test.each(['disconnect', 'logout'] as const)('%s rejects a pending public handshake and allows a later connection', async (operation) => {
    const h = makeHarness({ party: false });
    await startAndResetRequests(h);
    stompOutcomes.push('timeout');
    const connecting = h.client.stomp.connect();
    const rejected = expect(connecting).rejects.toThrow();
    const before = stompSockets.length;
    if (operation === 'logout') await h.client.logout();
    else h.client.stomp.disconnect();
    await rejected;

    await advance(100);
    expect(stompSockets).toHaveLength(before);
    expect(h.client.stomp.isConnected).toBe(false);
    expect(h.client.stomp.connectionId).toBeUndefined();
    expect(h.client.stomp.publicConnectionId).toBeUndefined();
    expect(h.client.stomp.privateConnectionId).toBeUndefined();
    if (operation === 'logout') await h.client.login();
    else await h.client.stomp.connect();
    expect(stompSockets).toHaveLength(before + 1);
    expect(h.client.stomp.isConnected).toBe(true);
  });

  test.each(['disconnect', 'logout'] as const)('%s also cancels an in-flight recovery handshake', async (operation) => {
    const h = makeHarness({ party: false });
    await startAndResetRequests(h);
    stompOutcomes.push('timeout');
    dropConnection('stomp');
    await advance(10);
    const before = stompSockets.length;
    if (operation === 'logout') await h.client.logout();
    else h.client.stomp.disconnect();

    await advance(100);
    expect(stompSockets).toHaveLength(before);
    expect(h.client.stomp.isConnected).toBe(false);
    if (operation === 'logout') await h.client.login();
    else await h.client.stomp.connect();
    expect(stompSockets).toHaveLength(before + 1);
    expect(h.client.stomp.isConnected).toBe(true);
    await advance(100);
    expect(stompSockets).toHaveLength(before + 1);
  });

  test('starts another handshake while an obsolete party rebind is still pending', async () => {
    const h = makeHarness();
    await startAndResetRequests(h);
    const before = stompSockets.length;
    const held = h.holdNext('party-rebind');
    const rebinding = h.nextRequest('party-rebind');
    dropConnection('stomp');
    await advance(10);
    await rebinding;
    const obsolete = stompSockets.at(-1)!;
    const obsoleteId = h.client.stomp.publicConnectionId;
    obsolete.drop();
    await advance(19);
    expect(stompSockets).toHaveLength(before + 1);
    await advance(1);
    expect(stompSockets).toHaveLength(before + 2);
    const current = stompSockets.at(-1)!;
    const currentId = h.client.stomp.publicConnectionId;
    expect(current).not.toBe(obsolete);
    expect(currentId).toBeTruthy();
    expect(currentId).not.toBe(obsoleteId);
    expect(current.readyState).toBe(1);
    expect(h.client.stomp.isConnected).toBe(true);
    expect(h.requestsOf('party-rebind')).toHaveLength(1);

    held.resolve();
    await advance(0);
    expect(current.readyState).toBe(1);
    expect(h.client.stomp.isConnected).toBe(true);
    expect(h.client.stomp.publicConnectionId).toBe(currentId);
    expect(h.client.party?.eosId).toBe(h.partyId);

    const nextRebind = h.nextRequest('party-rebind');
    current.drop();
    await advance(10);
    await nextRebind;
    expect(stompSockets).toHaveLength(before + 3);
    expect(h.client.stomp.isConnected).toBe(true);
    expect(h.requestsOf('party-rebind').at(-1)?.data).toEqual({
      connection_id: h.client.stomp.publicConnectionId,
      yield_leadership: false,
    });
    expect(h.disconnected).not.toHaveBeenCalled();
  });

  test('retries when the protocol succeeds but party restoration fails', async () => {
    const h = makeHarness();
    await startAndResetRequests(h);
    const before = stompSockets.length;
    h.failNext('party-rebind');
    dropConnection('stomp');
    await advance(10);
    expect(stompSockets).toHaveLength(before + 1);
    expect(h.requestsOf('party-rebind')).toHaveLength(1);
    expect(h.client.stomp.isConnected).toBe(false);
    await advance(19);
    expect(stompSockets).toHaveLength(before + 1);
    await advance(1);

    expect(stompSockets).toHaveLength(before + 2);
    expect(h.client.stomp.isConnected).toBe(true);
    expect(h.client.party?.eosId).toBe(h.partyId);
    expect(h.requestsOf('party-rebind')).toHaveLength(2);
    expect(h.requestsOf('party-rebind').at(-1)?.data).toEqual({
      connection_id: h.client.stomp.publicConnectionId,
      yield_leadership: false,
    });
    expect(h.requestsOf('party-create')).toHaveLength(0);
    expect(h.disconnected).not.toHaveBeenCalled();
  });

  test('cleans up logout even when token revocation rejects', async () => {
    const h = makeHarness({ config: { fetchFriends: true } });
    await startAndResetRequests(h);
    expect(h.client.friend.list.has('friend-1')).toBe(true);
    const before = stompSockets.length;
    h.failNext('revoke');
    await expect(h.client.logout()).rejects.toBeInstanceOf(EpicgamesAPIError);

    expectLoggedOut(h.client);
    expect(h.client.friend.list.size).toBe(0);
    expect(h.disconnected).toHaveBeenCalledTimes(1);
    await advance(100);
    expect(stompSockets).toHaveLength(before);
  });

  test('contains a revocation rejection from event-driven retry exhaustion', async () => {
    const h = makeHarness({ config: { stompMaxConnectionRetries: 1 } });
    await startAndResetRequests(h);
    const before = stompSockets.length;
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    try {
      h.failNext('revoke');
      stompOutcomes.push('error');
      dropConnection('stomp');
      await advance(10);
      await advance(100);

      expect(h.requestsOf('revoke').length).toBeGreaterThan(0);
      expect(h.disconnected).toHaveBeenCalledTimes(1);
      expectLoggedOut(h.client);
      expect(stompSockets).toHaveLength(before + 1);
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.removeListener('unhandledRejection', unhandled);
    }
  });
});

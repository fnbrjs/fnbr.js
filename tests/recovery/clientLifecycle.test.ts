import { describe, expect, jest, test } from '@jest/globals';
import WS from 'ws';
import {
  advance, dropConnection, expectLoggedOut, makeHarness, selfId, setupRecoveryFixtures, startAndResetRequests,
  stompOutcomes, stompSockets, xmppOutcomes, xmppSockets,
} from './fixtures';

setupRecoveryFixtures();

describe('client startup and shared party recovery', () => {
  test('initializes both services and party state before the first ready event', async () => {
    const h = makeHarness();
    const observed: boolean[] = [];
    h.client.on('ready', () => {
      observed.push(h.client.xmpp.isConnected && !!h.client.stomp.publicConnectionId && !!h.client.party?.me);
    });
    await startAndResetRequests(h);

    expect(observed).toEqual([true]);
    expect(h.client.isReady).toBe(true);
    expect(h.client.party?.eosId).toBe(h.partyId);
  });

  test('initial authentication failure rejects without starting transports or retrying', async () => {
    const h = makeHarness();
    const failure = new Error('Fixture authentication rejected');
    jest.mocked(h.client.auth.authenticate).mockRejectedValueOnce(failure);
    await expect(h.client.login()).rejects.toBe(failure);
    await advance(100);

    expect(h.ready).not.toHaveBeenCalled();
    expect(h.client.isReady).toBe(false);
    expect(xmppSockets).toHaveLength(0);
    expect(stompSockets).toHaveLength(0);
  });

  test.each(['xmpp', 'stomp'] as const)('initial %s failure does not enter recovery or emit ready', async (transport) => {
    const h = makeHarness({ party: false });
    if (transport === 'xmpp') xmppOutcomes.push('error');
    else stompOutcomes.push('error');
    await expect(h.client.login()).rejects.toThrow();
    await advance(100);

    expect(xmppSockets).toHaveLength(1);
    expect(stompSockets).toHaveLength(1);
    expect(h.client.isReady).toBe(false);
    expect(h.ready).not.toHaveBeenCalled();
    // Failed startup does not promise comprehensive rollback of the other service.
    expect(transport === 'xmpp' ? h.client.stomp.isConnected : h.client.xmpp.isConnected).toBe(true);
  });

  test.each(['xmpp', 'stomp'] as const)('logout rejects login during a pending %s handshake', async (transport) => {
    const h = makeHarness({ party: false });
    if (transport === 'xmpp') xmppOutcomes.push('timeout');
    else stompOutcomes.push('timeout');
    const login = h.client.login();
    const rejected = expect(login).rejects.toThrow();
    await advance(0);
    await h.client.logout();
    await rejected;
    await advance(100);

    expectLoggedOut(h.client);
    expect(h.ready).not.toHaveBeenCalled();
    expect(xmppSockets).toHaveLength(1);
    expect(stompSockets).toHaveLength(1);
    await h.client.login();
    expect(h.client.isReady).toBe(true);
    expect(h.ready).toHaveBeenCalledTimes(1);
  });

  test.each(['xmpp', 'stomp'] as const)('%s recovery recreates a missing party using client defaults', async (transport) => {
    const h = makeHarness({ config: { partyConfig: { maxSize: 8 } } });
    await startAndResetRequests(h);
    h.client.party!.config.maxSize = 2;
    h.loseParty();
    dropConnection(transport);
    expect(h.client.isReady).toBe(true);
    await advance(10);

    expect(h.client.party?.eosId).not.toBe(h.partyId);
    expect(h.client.party?.me.id).toBe(selfId);
    expect(h.client.party?.maxSize).toBe(8);
    expect(h.requestsOf('party-create')).toEqual([
      expect.objectContaining({ data: expect.objectContaining({ config: { joinability: 'OPEN', max_size: 8 } }) }),
    ]);
    expect(h.client.isReady).toBe(true);
    expect(h.ready).toHaveBeenCalledTimes(1);
  });

  test.each(['xmpp', 'stomp'] as const)('%s recovery does not create a previously absent party', async (transport) => {
    const h = makeHarness({ party: false });
    await startAndResetRequests(h);
    h.client.config.createParty = true;
    h.client.config.forceNewParty = true;
    dropConnection(transport);
    await advance(10);

    expect(h.client.party).toBeUndefined();
    expect(h.requestsOf('party-create')).toHaveLength(0);
    expect(h.requestsOf('party-state')).toHaveLength(0);
    expect(h.client.xmpp.isConnected && h.client.stomp.isConnected).toBe(true);
    expect(h.ready).toHaveBeenCalledTimes(1);
  });

  test.each(['xmpp', 'stomp'] as const)('%s skips automatic party work when the service is disabled', async (transport) => {
    const h = makeHarness();
    await startAndResetRequests(h);
    h.client.config.disablePartyService = true;
    dropConnection(transport);
    await advance(10);

    expect(h.client.party?.eosId).toBe(h.partyId);
    expect(h.requestsOf('party-state')).toHaveLength(0);
    expect(h.requestsOf('party-rebind')).toHaveLength(0);
    expect(h.requestsOf('party-create')).toHaveLength(0);
    expect(h.client.xmpp.isConnected && h.client.stomp.isConnected).toBe(true);
  });

  test.each(['xmpp', 'stomp'] as const)('%s preserves an existing party despite startup forceNewParty', async (transport) => {
    const h = makeHarness();
    await startAndResetRequests(h);
    h.client.config.createParty = true;
    h.client.config.forceNewParty = true;
    dropConnection(transport);
    await advance(10);

    expect(h.client.party?.eosId).toBe(h.partyId);
    expect(h.requestsOf('party-rebind')).toHaveLength(1);
    expect(h.requestsOf('party-create')).toHaveLength(0);
    expect(h.ready).toHaveBeenCalledTimes(1);
  });

  test.each(['xmpp', 'stomp'] as const)('%s retries a temporary party lookup failure without recreating', async (transport) => {
    const h = makeHarness();
    await startAndResetRequests(h);
    h.failNext('party-state');
    dropConnection(transport);
    await advance(10);
    expect(h.requestsOf('party-create')).toHaveLength(0);
    await advance(20);

    expect(h.client.party?.eosId).toBe(h.partyId);
    expect(h.requestsOf('party-state')).toHaveLength(2);
    expect(h.requestsOf('party-create')).toHaveLength(0);
    expect(h.disconnected).not.toHaveBeenCalled();
  });

  test.each(['xmpp', 'stomp'] as const)('%s recreates after a confirmed missing-party rebind', async (transport) => {
    const h = makeHarness();
    await startAndResetRequests(h);
    h.failNext('party-rebind', 404);
    dropConnection(transport);
    await advance(10);

    expect(h.client.party?.eosId).not.toBe(h.partyId);
    expect(h.client.party?.me.id).toBe(selfId);
    expect(h.requestsOf('party-create')).toHaveLength(1);
    expect(h.disconnected).not.toHaveBeenCalled();
  });

  test.each(['xmpp', 'stomp'] as const)('%s remembers the prior party after a failed recreation clears its cache', async (transport) => {
    const h = makeHarness();
    await startAndResetRequests(h);
    h.loseParty();
    h.failNext('party-create');
    dropConnection(transport);
    await advance(10);
    expect(h.client.party).toBeUndefined();
    expect(h.requestsOf('party-create')).toHaveLength(1);
    await advance(20);

    expect(h.requestsOf('party-create')).toHaveLength(2);
    expect(h.client.party?.me.id).toBe(selfId);
    expect(h.client.xmpp.isConnected && h.client.stomp.isConnected).toBe(true);
  });

  test.each(['xmpp', 'stomp'] as const)('defers shared party recovery until %s reconnects last', async (last) => {
    const h = makeHarness({ config: {
      xmppConnectionRetryBackoff: [last === 'xmpp' ? 20 : 10],
      stompConnectionRetryBackoff: [last === 'stomp' ? 20 : 10],
    } });
    await startAndResetRequests(h);
    dropConnection('xmpp');
    dropConnection('stomp');
    await advance(10);
    expect(h.requestsOf('party-rebind')).toHaveLength(0);
    expect(h.requestsOf('party-create')).toHaveLength(0);
    expect(h.client.isReady).toBe(true);
    await advance(10);

    expect(h.client.xmpp.isConnected && h.client.stomp.isConnected).toBe(true);
    expect(h.requestsOf('party-rebind')).toHaveLength(1);
    expect(h.client.party?.eosId).toBe(h.partyId);
    expect(h.ready).toHaveBeenCalledTimes(1);
  });

  test('simultaneous losses share one pending party restoration and create only one replacement', async () => {
    const h = makeHarness();
    await startAndResetRequests(h);
    h.loseParty();
    const held = h.holdNext('party-state');
    const lookup = h.nextRequest('party-state');
    dropConnection('xmpp');
    dropConnection('stomp');
    await advance(10);
    await lookup;
    expect(h.requestsOf('party-state')).toHaveLength(1);
    expect(h.requestsOf('party-create')).toHaveLength(0);
    held.resolve();
    await advance(0);

    expect(h.requestsOf('party-create')).toHaveLength(1);
    expect(h.client.party?.me.id).toBe(selfId);
    expect(h.client.xmpp.isConnected && h.client.stomp.isConnected).toBe(true);
    expect(h.ready).toHaveBeenCalledTimes(1);
  });

  test.each(['xmpp', 'stomp'] as const)('%s exhaustion never terminates the application process', async (transport) => {
    const h = makeHarness({ config: { xmppMaxConnectionRetries: 0, stompMaxConnectionRetries: 0 } });
    await startAndResetRequests(h);
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('Unexpected process exit');
    });
    dropConnection(transport);
    await advance(0);

    expect(exit).not.toHaveBeenCalled();
    expect(h.disconnected).toHaveBeenCalledTimes(1);
    expectLoggedOut(h.client);
  });
});

describe('recovery ownership', () => {
  test('concurrent party restoration requests share one replacement operation', async () => {
    const h = makeHarness();
    await startAndResetRequests(h);
    h.loseParty();
    const held = h.holdNext('party-state');
    const lookup = h.nextRequest('party-state');
    const first = h.client.recoverParty(true);
    const second = h.client.recoverParty(true);
    await lookup;
    await advance(0);
    expect(h.requestsOf('party-state')).toHaveLength(1);
    held.resolve();
    await Promise.all([first, second]);

    expect(h.requestsOf('party-create')).toHaveLength(1);
    expect(h.client.party?.me.id).toBe(selfId);
    expect(h.requestsOf('party-rebind').at(-1)?.data).toEqual({
      connection_id: h.client.stomp.publicConnectionId,
      yield_leadership: false,
    });
  });

  test.each(['xmpp', 'stomp'] as const)('late events from a cancelled %s handshake cannot replace a newer connection', async (transport) => {
    const h = makeHarness({ party: false });
    await startAndResetRequests(h);
    if (transport === 'xmpp') {
      h.client.xmpp.disconnect();
      xmppOutcomes.push('timeout');
      const pending = h.client.xmpp.connect();
      const rejected = expect(pending).rejects.toThrow();
      const obsolete = xmppSockets.at(-1)!;
      h.client.xmpp.disconnect();
      await rejected;
      await h.client.xmpp.connect();
      const current = xmppSockets.at(-1)!;

      obsolete.sessionStarted = true;
      obsolete.emit('session:started');
      obsolete.drop();
      await advance(100);
      expect(xmppSockets).toHaveLength(3);
      expect(current.sessionStarted).toBe(true);
      expect(h.client.xmpp.JID).toBe(current.jid);
    } else {
      stompOutcomes.push('timeout');
      const pending = h.client.stomp.connect();
      const rejected = expect(pending).rejects.toThrow();
      const obsolete = stompSockets.at(-1)!;
      h.client.stomp.disconnect();
      await rejected;
      await h.client.stomp.connect();
      const current = stompSockets.at(-1)!;
      const connectionId = h.client.stomp.publicConnectionId;

      obsolete.readyState = WS.OPEN;
      obsolete.emit('open');
      obsolete.emit('message', Buffer.from('CONNECTED\nsession:obsolete\n\n\0'));
      obsolete.drop();
      await advance(100);
      expect(stompSockets).toHaveLength(3);
      expect(current.readyState).toBe(WS.OPEN);
      expect(h.client.stomp.publicConnectionId).toBe(connectionId);
    }
    expect(h.client.isReady).toBe(true);
    expect(h.ready).toHaveBeenCalledTimes(1);
    expect(h.disconnected).not.toHaveBeenCalled();
  });
});

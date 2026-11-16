import { EventEmitter } from 'events';
import { afterEach, beforeEach, expect, jest } from '@jest/globals';
import { AxiosError } from 'axios';
import WS from 'ws';
import Client from '../../src/Client';
import FortniteAuthSession from '../../src/auth/FortniteAuthSession';
import EOSAuthSession from '../../src/auth/EOSAuthSession';
import Endpoints from '../../resources/Endpoints';
import { AuthSessionStoreKey } from '../../resources/enums';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import type { ClientOptions, EOSPartyData, FortnitePartyData } from '../../resources/structs';

jest.mock('stanza', () => ({
  createClient: (config: { resource?: string }) => mockCreateXmpp(config),
}));
jest.mock('ws', () => Object.assign(function createSocket() {
  return mockCreateStomp();
}, { OPEN: 1, CLOSED: 3 }));

type Outcome = 'success' | 'error' | 'close' | 'timeout';
type StompOutcome = Outcome | 'eos-error' | 'stomp-error' | 'missing-ids';
type Route = 'presence' | 'friends' | 'party-state' | 'party-rebind' | 'party-create' | 'revoke'
  | 'lobby' | 'lobby-join' | 'party-patch' | 'member-patch' | 'party-delete' | 'account' | 'lobby-state' | 'keep-alive';
export interface RequestRecord { route: Route; method: string; url: string; data: unknown }

export const selfId = '1'.repeat(32);
const fixtureDate = '2026-01-01T00:00:00.000Z';

export interface XmppSocket extends EventEmitter {
  sessionStarted: boolean;
  jid: string;
  config: { resource?: string };
  connect(): void;
  disconnect(): void;
  enableKeepAlive(): void;
  disableKeepAlive(): void;
  drop(): void;
}

export interface StompSocket extends EventEmitter {
  readyState: number;
  sent: string[];
  send(frame: string): void;
  terminate(): void;
  close(): void;
  drop(): void;
}

export interface Harness {
  client: Client;
  partyId: string;
  requests: RequestRecord[];
  ready: jest.Mock;
  disconnected: jest.Mock;
  requestsOf(route: Route): RequestRecord[];
  loseParty(): void;
  nextRequest(route: Route): Promise<RequestRecord>;
  failNext(route: Route, status?: number): void;
  holdNext(route: Route): { resolve(): void };
  releaseResponses(): void;
}

export const xmppOutcomes: Outcome[] = [];
export const stompOutcomes: StompOutcome[] = [];
const mockCreateXmpp = jest.fn<(config: { resource?: string }) => XmppSocket>();
const mockCreateStomp = jest.fn<() => StompSocket>();

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function xmppSocket(config: { resource?: string }, outcome: Outcome): XmppSocket {
  const socket = Object.assign(new EventEmitter(), {
    sessionStarted: false,
    jid: `${selfId}@fixture.invalid/${config.resource}`,
    config,
    connect: jest.fn<() => void>(),
    disconnect: jest.fn<() => void>(),
    enableKeepAlive: jest.fn(),
    disableKeepAlive: jest.fn(),
    drop() {
      socket.sessionStarted = false;
      socket.emit('disconnected');
    },
  });
  socket.disconnect.mockImplementation(() => {
    socket.sessionStarted = false;
  });
  socket.connect.mockImplementation(() => {
    Promise.resolve().then(() => {
      if (outcome === 'error') socket.emit('stream:error', { condition: 'connection-timeout' });
      else if (outcome === 'close') socket.drop();
      else if (outcome === 'success') {
        socket.sessionStarted = true;
        socket.emit('session:started');
      }
    });
  });
  return socket;
}

function stompSocket(outcome: StompOutcome): StompSocket {
  const socket = Object.assign(new EventEmitter(), {
    readyState: 0,
    sent: [] as string[],
    send: jest.fn<(frame: string) => void>(),
    terminate: jest.fn<() => void>(),
    close: jest.fn<() => void>(),
    drop() {
      socket.readyState = WS.CLOSED;
      socket.emit('close', 1006, Buffer.from('service unavailable'));
    },
  });
  socket.terminate.mockImplementation(() => {
    socket.readyState = WS.CLOSED;
  });
  socket.close.mockImplementation(() => socket.drop());
  socket.send.mockImplementation((frame) => {
    socket.sent.push(frame);
    if (!frame.startsWith('CONNECT\n') || outcome === 'timeout') return;
    // Server responses arrive after the client's message listener is registered.
    Promise.resolve().then(() => {
      if (outcome === 'stomp-error') {
        socket.emit('message', Buffer.from('ERROR\n\n\0'));
        return;
      }
      socket.emit('message', Buffer.from('CONNECTED\nsession:fixture\n\n\0'));
      const data = outcome === 'eos-error'
        ? { type: 'core.connect.v1.connect-failed', message: 'service unavailable', statusCode: 503 }
        : { type: 'core.connect.v1.connected', ...outcome === 'missing-ids' ? {} : { connectionId: `connection-${stompSockets.length}` } };
      socket.emit('message', Buffer.from(`MESSAGE\n\n${JSON.stringify(data)}\0`));
    });
  });
  Promise.resolve().then(() => {
    if (outcome === 'error') socket.emit('error', new Error('service unavailable'));
    else if (outcome === 'close') socket.drop();
    else {
      socket.readyState = WS.OPEN;
      socket.emit('open');
    }
  });
  return socket;
}

export const xmppSockets: XmppSocket[] = [];
export const stompSockets: StompSocket[] = [];

function routeFor(method: string, url: string): Route {
  if (url.startsWith(`${Endpoints.EOS_PRESENCE}/`)) return 'presence';
  if (url.startsWith(`${Endpoints.EOS_PARTY.replace('/party', '/presence/internal/v1/_')}/`)) return 'presence';
  if (url.startsWith(`${Endpoints.FRIENDS}/`) && url.endsWith('/summary')) return 'friends';
  if (url.startsWith(`${Endpoints.EOS_PARTY_INTERNAL}/users/`)) return 'party-state';
  if (url.startsWith(`${Endpoints.EOS_PARTY}/v2/`) && url.endsWith('/connect')) return 'party-rebind';
  if (url === `${Endpoints.EOS_PARTY_INTERNAL}/parties` && method === 'POST') return 'party-create';
  if (url.endsWith('/keep-alive')) return 'keep-alive';
  if (url.startsWith(`${Endpoints.OAUTH_TOKEN_KILL}/`) || url === Endpoints.EOS_TOKEN_REVOKE) return 'revoke';
  if (url.startsWith(`${Endpoints.BR_PARTY}/user/`)) return 'lobby-state';
  if (url.startsWith(`${Endpoints.BR_PARTY}/epic-parties/`)) return 'lobby-join';
  if (method === 'DELETE' && (url.startsWith(Endpoints.BR_PARTY) || url.startsWith(Endpoints.EOS_PARTY_INTERNAL))) return 'party-delete';
  if (url.startsWith(`${Endpoints.BR_PARTY}/parties/`)) {
    if (method === 'GET') return 'lobby';
    if (method === 'PATCH') return url.endsWith('/meta') ? 'member-patch' : 'party-patch';
  }
  if (url.startsWith(Endpoints.ACCOUNT_ID) || url.startsWith(Endpoints.ACCOUNT_DISPLAYNAME)) return 'account';
  throw new Error(`Unexpected fixture request: ${method} ${url}`);
}

export function makeHarness(options: { party?: boolean; config?: ClientOptions } = {}): Harness {
  const requests: RequestRecord[] = [];
  const actions = new Map<Route, ((config: InternalAxiosRequestConfig) => Promise<void>)[]>();
  const waiters = new Map<Route, ((record: RequestRecord) => void)[]>();
  const held: (() => void)[] = [];
  const partyId = 'a'.repeat(32);
  let currentPartyId = partyId;
  let partyExists = options.party ?? true;
  let created = 0;
  let maxSize = 16;
  const eosParty = (): EOSPartyData => ({
    id: currentPartyId, party_lead: selfId, created_at: fixtureDate, updated_at: fixtureDate,
    config: { joinability: 'OPEN', max_size: maxSize }, meta: {}, revision: 0,
    chat_conversation_id: 'fixture-conversation', is_reportable: false,
  });
  const lobby = (): FortnitePartyData => ({
    id: `${currentPartyId}-12345-default`, created_at: fixtureDate, updated_at: fixtureDate,
    config: {
      type: 'DEFAULT', sub_type: 'default', joinability: 'OPEN', discoverability: 'ALL', max_size: maxSize,
      invite_ttl: 3600, intention_ttl: 60, join_confirmation: false,
    },
    members: [{ id: selfId, account_id: selfId, account_dn: 'Fixture User', meta: {}, revision: 0,
      joined_at: fixtureDate, updated_at: fixtureDate }],
    meta: {}, invites: [], revision: 0,
  });
  const user = (id: string) => ({
    id, displayName: id === selfId ? 'Fixture User' : 'Recovered Friend', externalAuths: {},
    lastLogin: fixtureDate, lastDisplayNameChange: fixtureDate,
  });
  const adapter: AxiosAdapter = async (config) => {
    const url = config.url!;
    const method = config.method!.toUpperCase();
    const route = routeFor(method, url);
    const body = typeof config.data === 'string' && config.data.startsWith('{') ? JSON.parse(config.data) : config.data;
    const record = { route, method, url, data: body };
    requests.push(record);
    for (const resolve of waiters.get(route) ?? []) resolve(record);
    waiters.delete(route);
    await actions.get(route)?.shift()?.(config);
    let data: unknown;
    switch (route) {
      case 'account': {
        const ids = new URL(url).searchParams.getAll('accountId');
        data = ids.length ? ids.map(user) : user(url.endsWith(selfId) ? selfId : 'friend-1');
        break;
      }
      case 'friends':
        data = { friends: [{ accountId: 'friend-1', created: fixtureDate, favorite: false }], incoming: [], outgoing: [], blocklist: [] };
        break;
      case 'party-state':
        data = { current: partyExists ? eosParty() : undefined };
        break;
      case 'lobby-state':
        data = { current: partyExists ? [{ id: lobby().id }] : [] };
        break;
      case 'lobby': case 'lobby-join':
        data = lobby();
        break;
      case 'party-create':
        created += 1;
        currentPartyId = created.toString(16).padStart(32, '0');
        partyExists = true;
        maxSize = body.config.max_size;
        data = eosParty();
        break;
      case 'party-delete':
        partyExists = false;
        break;
      case 'presence': case 'party-rebind': case 'revoke': case 'party-patch': case 'member-patch': case 'keep-alive':
        data = {};
        break;
    }
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
  const client = new Client({
    createParty: false, forceNewParty: false, fetchFriends: false, partyBuildId: '12345', statusUpdateInterval: 0,
    xmppMaxConnectionRetries: 3, stompMaxConnectionRetries: 3,
    xmppConnectionRetryBackoff: [10, 20, 30], stompConnectionRetryBackoff: [10, 20, 30],
    xmppConnectionTimeout: 5, stompConnectionTimeout: 5,
    restRetryLimit: 0, handleRatelimits: false,
    cacheSettings: { users: { sweepInterval: 0, maxLifetime: Infinity }, presences: { sweepInterval: 0, maxLifetime: 0 } },
    ...options.config,
    http: { ...options.config?.http, adapter },
  });
  const authData = {
    access_token: 'fixture-access', account_id: selfId, client_id: 'fixture-client', expires_at: '2030-01-01T00:00:00Z',
    expires_in: 3600, token_type: 'bearer', refresh_token: 'fixture-refresh', refresh_expires: 7200,
    refresh_expires_at: '2030-01-02T00:00:00Z',
  };
  client.auth.sessions.set(AuthSessionStoreKey.Fortnite, new FortniteAuthSession(client, {
    ...authData, app: 'fortnite', client_service: 'fortnite', displayName: 'Fixture User',
    internal_client: true, in_app_id: selfId, device_id: 'fixture-device',
  }, 'fixture-secret'));
  client.auth.sessions.set(AuthSessionStoreKey.FortniteEOS, new EOSAuthSession(client, {
    ...authData, application_id: 'fixture-application', merged_accounts: [], scope: 'basic_profile',
  }, 'fixture-secret', {}));
  jest.spyOn(client.auth, 'authenticate').mockResolvedValue(undefined);
  const ready = jest.fn();
  const disconnected = jest.fn();
  client.on('ready', ready);
  client.on('disconnected', disconnected);
  const harness = {
    client, partyId, requests, ready, disconnected,
    requestsOf: (route: Route) => requests.filter((request) => request.route === route),
    loseParty() { partyExists = false; },
    nextRequest(route: Route) {
      const next = deferred<RequestRecord>();
      waiters.set(route, [...waiters.get(route) ?? [], next.resolve]);
      return next.promise;
    },
    failNext(route: Route, status = 503) {
      actions.set(route, [...actions.get(route) ?? [], async (config: InternalAxiosRequestConfig) => {
        const data = { errorCode: 'errors.com.epicgames.fixture.failure', errorMessage: 'Fixture service failure' };
        throw new AxiosError('Fixture service failure', 'ERR_BAD_RESPONSE', config, undefined,
          { data, status, statusText: 'Fixture failure', headers: {}, config });
      }]);
    },
    holdNext(route: Route) {
      const gate = deferred<void>();
      const resolve = () => gate.resolve();
      held.push(resolve);
      actions.set(route, [...actions.get(route) ?? [], () => gate.promise]);
      return { resolve };
    },
    releaseResponses() { held.forEach((resolve) => resolve()); },
  };
  harnesses.push(harness);
  return harness;
}

const harnesses: Harness[] = [];
export const advance = (milliseconds: number) => jest.advanceTimersByTimeAsync(milliseconds);

export async function startAndResetRequests(harness: Harness) {
  await harness.client.login();
  harness.requests.length = 0;
}

export function dropConnection(transport: 'xmpp' | 'stomp') {
  const socket = (transport === 'xmpp' ? xmppSockets : stompSockets).at(-1);
  if (!socket) throw new Error(`No ${transport} connection has been created`);
  socket.drop();
}

export function expectLoggedOut(client: Client) {
  expect(client.isReady).toBe(false);
  expect(client.xmpp.isConnected).toBe(false);
  expect(client.stomp.isConnected).toBe(false);
  expect(client.stomp.connectionId).toBeUndefined();
  expect(client.stomp.publicConnectionId).toBeUndefined();
  expect(client.stomp.privateConnectionId).toBeUndefined();
  expect(client.party).toBeUndefined();
}

export function setupRecoveryFixtures() {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(fixtureDate) });
    xmppSockets.length = 0;
    stompSockets.length = 0;
    xmppOutcomes.length = 0;
    stompOutcomes.length = 0;
    mockCreateXmpp.mockImplementation((config) => {
      const socket = xmppSocket(config, xmppOutcomes.shift() ?? 'success');
      xmppSockets.push(socket);
      return socket;
    });
    mockCreateStomp.mockImplementation(() => {
      const socket = stompSocket(stompOutcomes.shift() ?? 'success');
      stompSockets.push(socket);
      return socket;
    });
  });

  afterEach(async () => {
    try {
      harnesses.forEach((harness) => harness.releaseResponses());
      await Promise.allSettled(harnesses.map((harness) => harness.client.logout()));
      await advance(0);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      harnesses.length = 0;
      jest.restoreAllMocks();
      jest.clearAllMocks();
      jest.useRealTimers();
    }
  });
}

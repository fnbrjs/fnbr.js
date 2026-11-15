/* eslint-disable max-len */
import { createClient as createStanzaClient } from 'stanza';
import crypto from 'crypto';
import Base from '../Base';
import Endpoints from '../../resources/Endpoints';
import Friend from '../structures/friend/Friend';
import IncomingPendingFriend from '../structures/friend/IncomingPendingFriend';
import OutgoingPendingFriend from '../structures/friend/OutgoingPendingFriend';
import BlockedUser from '../structures/user/BlockedUser';
import PartyMemberConfirmation from '../structures/party/PartyMemberConfirmation';
import { AuthSessionStoreKey } from '../../resources/enums';
import AuthenticationMissingError from '../exceptions/AuthenticationMissingError';
import XMPPConnectionTimeoutError from '../exceptions/XMPPConnectionTimeoutError';
import XMPPConnectionError from '../exceptions/XMPPConnectionError';
import XMPPMetadataStore from './XMPPMetadataStore';
import type { Agent } from 'stanza';
import type { StreamError } from 'stanza/protocol';

/**
 * Represents the client's XMPP manager
 * @private
 */
class XMPP extends Base {
  public readonly metadataStore = new XMPPMetadataStore(this.client);
  /**
   * XMPP agent
   */
  private connection?: Agent;

  private connectionPromise?: Promise<void>;

  private cancelConnect?: (error: Error) => void;

  private retryTimer?: ReturnType<typeof setTimeout>;

  private recovering = false;

  private lifecycle = 0;

  /**
   * Whether the XMPP agent is connected
   */
  public get isConnected() {
    return !!this.connection && this.connection.sessionStarted;
  }

  /**
   * Returns the xmpp JID
   */
  public get JID() {
    return this.connection?.jid;
  }

  /**
   * Returns the xmpp resource
   */
  public get resource() {
    return this.connection?.config.resource;
  }

  /**
   * Connects the XMPP agent to Epicgames' XMPP servers
   * @param sendStatusWhenConnected Whether to send an empty status status when connected
   */
  public async connect(sendStatusWhenConnected = true) {
    if (!this.client.auth.sessions.has(AuthSessionStoreKey.Fortnite)) {
      throw new AuthenticationMissingError(AuthSessionStoreKey.Fortnite);
    }

    if (this.connectionPromise) return this.connectionPromise;
    if (this.isConnected) return undefined;
    const connection = createStanzaClient({
      jid: `${this.client.user.self!.id}@${Endpoints.EPIC_PROD_ENV}`,
      server: Endpoints.EPIC_PROD_ENV,
      transports: {
        websocket: `wss://${Endpoints.XMPP_SERVER}`,
        bosh: false,
      },
      credentials: {
        host: Endpoints.EPIC_PROD_ENV,
        username: this.client.user.self!.id,
        password: this.client.auth.sessions.get(AuthSessionStoreKey.Fortnite)!.accessToken,
      },
      resource: `V2:Fortnite:${this.client.config.platform}::${crypto.randomBytes(16).toString('hex').toUpperCase()}`,
    });

    this.connection = connection;
    this.client.debug('[XMPP] Connecting...');
    const connectionStartTime = Date.now();

    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let onStarted: () => void;
    let onError: (error: StreamError) => void;
    const settle = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      connection.removeListener('session:started', onStarted);
      connection.removeListener('stream:error', onError);
      if (this.connection === connection) {
        this.connectionPromise = undefined;
        this.cancelConnect = undefined;
      }
      if (error) {
        this.closeConnection(connection);
        reject(error);
      } else {
        this.client.debug(`[XMPP] Successfully connected (${((Date.now() - connectionStartTime) / 1000).toFixed(2)}s)`);
        resolve();
      }
    };
    onStarted = async () => {
      if (settled) return;
      clearTimeout(timeout);
      try {
        if (sendStatusWhenConnected) await this.client.setStatus();
        settle();
      } catch (error) {
        settle(error instanceof Error ? error : new Error(String(error)));
      }
    };
    onError = (error: StreamError) => settle(new XMPPConnectionError(error));
    this.connectionPromise = promise;
    this.cancelConnect = settle;
    try {
      timeout = setTimeout(() => {
        settle(new XMPPConnectionTimeoutError(this.client.config.xmppConnectionTimeout));
      }, this.client.config.xmppConnectionTimeout);
      connection.once('session:started', onStarted);
      connection.once('stream:error', onError);
      connection.enableKeepAlive({
        interval: this.client.config.xmppKeepAliveInterval,
      });
      this.setupEvents(connection);
      connection.connect();
    } catch (error) {
      settle(error instanceof Error ? error : new Error(String(error)));
    }
    return promise;
  }

  /**
   * Disconnects the XMPP client
   */
  public disconnect() {
    this.lifecycle += 1;
    this.recovering = false;
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    this.cancelConnect?.(new Error('XMPP connection disconnected'));
    if (this.connection) this.closeConnection(this.connection);
    this.metadataStore.clear();
    this.client.debug('[XMPP] Disconnected');
  }

  private closeConnection(connection: Agent) {
    if (this.connection === connection) {
      this.connection = undefined;
      this.metadataStore.clear();
    }
    connection.removeAllListeners();
    try {
      connection.disableKeepAlive();
    } catch (error) {
      this.client.debug(`[XMPP] Keepalive cleanup failed: ${String(error)}`);
    }
    try {
      connection.disconnect();
    } catch (error) {
      this.client.debug(`[XMPP] Disconnect failed: ${String(error)}`);
    }
  }

  private async restoreConnection(lifecycle: number, hadParty: boolean) {
    const promise = this.connect();
    const { connection } = this;
    const checkConnection = () => {
      if (lifecycle !== this.lifecycle || this.connection !== connection || !connection?.sessionStarted) {
        throw new Error('XMPP connection disconnected');
      }
    };
    try {
      await promise;
      checkConnection();
      if (this.client.config.fetchFriends) await this.client.updateCaches();
      checkConnection();
      await this.client.recoverParty(hadParty);
      checkConnection();
      return connection;
    } catch (error) {
      if (lifecycle === this.lifecycle && connection && this.connection === connection) this.closeConnection(connection);
      throw error;
    }
  }

  private recover(hadParty: boolean, attempt = 0, lifecycle = this.lifecycle): void {
    if (lifecycle !== this.lifecycle) return;
    if (attempt >= this.client.config.xmppMaxConnectionRetries) {
      this.recovering = false;
      this.client.debug('[XMPP] Disconnected, retry limit reached');
      this.client.logout().catch((error: unknown) => {
        this.client.debug(`[XMPP] Logout failed: ${String(error)}`);
      });
      return;
    }

    const backoff = this.client.config.xmppConnectionRetryBackoff;
    const delay = backoff[Math.min(attempt, backoff.length - 1)];
    this.client.debug(`[XMPP] Disconnected, reconnecting in ${delay / 1000} seconds...`);
    this.retryTimer = setTimeout(async () => {
      if (lifecycle !== this.lifecycle) return;
      this.retryTimer = undefined;
      try {
        const connection = await this.restoreConnection(lifecycle, hadParty);
        if (lifecycle !== this.lifecycle) return;
        if (this.connection !== connection || !this.isConnected) throw new Error('XMPP connection disconnected');
        this.recovering = false;
      } catch (error) {
        if (lifecycle !== this.lifecycle) return;
        this.client.debug(`[XMPP] Reconnect failed: ${String(error)}`);
        this.recover(hadParty, attempt + 1, lifecycle);
      }
    }, delay);
  }

  /**
   * Registers all events
   */
  private setupEvents(connection: Agent) {
    connection.on('disconnected', () => {
      if (this.connection !== connection) return;
      if (this.cancelConnect) {
        this.cancelConnect(new Error('XMPP connection disconnected'));
        return;
      }
      const hadParty = !!this.client.party;
      this.closeConnection(connection);
      if (this.recovering) return;
      this.recovering = true;
      this.recover(hadParty);
    });

    connection.on('raw:incoming', (raw) => this.client.debug(`IN ${raw}`, 'xmpp'));
    connection.on('raw:outgoing', (raw) => this.client.debug(`OUT ${raw}`, 'xmpp'));

    connection.on('message', async (m) => {
      if (this.connection !== connection) return;
      if (m.type && m.type !== 'normal') return;
      if (!m.body) return;
      if (m.from !== 'xmpp-admin@prod.ol.epicgames.com') return;

      let body: any;
      try {
        body = JSON.parse(m.body);
      } catch (err) {
        return;
      }

      if (!body.type) return;

      this.client.emit('xmpp:message', body);

      try {
        switch (body.type) {
          case 'com.epicgames.friends.core.apiobjects.Friend': {
            const {
              payload: {
                status, accountId, favorite, created, direction,
              },
            } = body;

            const user = await this.client.user.fetch(accountId);
            if (!user) break;

            if (status === 'ACCEPTED') {
              const friend = new Friend(this.client, {
                displayName: user.displayName,
                id: user.id,
                externalAuths: user.externalAuths,
                favorite,
                created,
                alias: '',
                note: '',
              });

              this.client.friend.list.set(friend.id, friend);
              this.client.friend.pendingList.delete(friend.id);

              this.client.emit('friend:added', friend);
            } else if (status === 'PENDING') {
              if (direction === 'INBOUND') {
                const pendingFriend = new IncomingPendingFriend(this.client, {
                  accountId: user.id,
                  // Type casting is fine here because the lookup by id always returns external auths
                  displayName: user.displayName as string,
                  created,
                  favorite,
                });

                this.client.friend.pendingList.set(pendingFriend.id, pendingFriend);
                this.client.emit('friend:request', pendingFriend);
              } else if (direction === 'OUTBOUND') {
                const pendingFriend = new OutgoingPendingFriend(this.client, {
                  accountId: user.id,
                  // Type casting is fine here because the lookup by id always returns external auths
                  displayName: user.displayName as string,
                  created,
                  favorite,
                });

                this.client.friend.pendingList.set(pendingFriend.id, pendingFriend);
                this.client.emit('friend:request:sent', pendingFriend);
              }
            }
          } break;

          case 'FRIENDSHIP_REMOVE': {
            const { from, to, reason } = body;
            const accountId = from === this.client.user.self!.id ? to : from;

            if (reason === 'ABORTED') {
              const pendingFriend = this.client.friend.pendingList.get(accountId);
              if (!pendingFriend) break;

              this.client.friend.pendingList.delete(pendingFriend.id);
              this.client.emit('friend:request:aborted', pendingFriend);
            } else if (reason === 'REJECTED') {
              const pendingFriend = this.client.friend.pendingList.get(accountId);
              if (!pendingFriend) break;

              this.client.friend.pendingList.delete(pendingFriend.id);
              this.client.emit('friend:request:declined', pendingFriend);
            } else if (reason === 'DELETED') {
              const friend = await this.client.waitForFriend(accountId);
              if (!friend) break;

              this.client.friend.list.delete(friend.id);
              this.client.emit('friend:removed', friend);
            }
          } break;

          case 'USER_BLOCKLIST_UPDATE': {
            const { status, accountId } = body;

            if (status === 'BLOCKED') {
              const user = await this.client.user.fetch(accountId);
              if (!user) break;

              const blockedUser = new BlockedUser(this.client, user);

              this.client.user.blocklist.set(user.id, blockedUser);
              this.client.emit('user:blocked', blockedUser);
            } else if (status === 'UNBLOCKED') {
              const blockedUser = this.client.user.blocklist.get(accountId);
              if (!blockedUser) break;

              this.client.user.blocklist.delete(blockedUser.id);
              this.client.emit('user:unblocked', blockedUser);
            }
          } break;

          case 'com.epicgames.social.party.notification.v0.MEMBER_JOINED':
          case 'com.epicgames.social.party.notification.v0.MEMBER_STATE_UPDATED': {
            if (this.client.config.disablePartyService) break;
            await this.client.partyLock.wait();
            const { party } = this.client;
            if (!party || party.id !== body.party_id || typeof body.account_id !== 'string') break;

            this.metadataStore.handleMemberMetadata(party, {
              account_id: body.account_id,
              account_dn: body.account_dn,
              revision: body.revision,
              member_state_updated: body.member_state_updated,
              member_state_removed: body.type === 'com.epicgames.social.party.notification.v0.MEMBER_JOINED'
                ? [] : body.member_state_removed,
            });
          } break;

          case 'com.epicgames.social.party.notification.v0.PARTY_UPDATED':
            if (this.client.config.disablePartyService) break;
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) break;

            this.client.party.updateFortniteData(body);

            this.client.emit('party:updated', this.client.party);

            await this.client.setStatus();
            break;

          // Unsure if this is still used, keeping for now
          case 'com.epicgames.social.party.notification.v0.MEMBER_REQUIRE_CONFIRMATION': {
            if (this.client.config.disablePartyService) break;
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) break;

            const user = await this.client.user.fetch(body.account_id);
            if (!user) break;

            const confirmation = new PartyMemberConfirmation(this.client, this.client.party, user, body);
            this.client.party.pendingMemberConfirmations.set(user.id, confirmation);

            if (this.client.listenerCount('party:member:confirmation') > 0) {
              this.client.emit('party:member:confirmation', confirmation);
            } else {
              await confirmation.confirm();
            }
          } break;
        }
      } catch (error) {
        const errorString = error instanceof Error ? `${error.name} - ${error.message}` : String(error);

        this.client.debug(`[XMPP] Error while processing ${body.type}: ${errorString}`);
        this.client.emit('xmpp:message:error', error instanceof Error ? error : new Error(errorString));
      }
    });
  }
}

export default XMPP;

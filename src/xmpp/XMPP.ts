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

  /**
   * The amount of times the XMPP agent has tried to reconnect
   */
  private connectionRetryCount = 0;

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

    this.connection = createStanzaClient({
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

    this.connection.enableKeepAlive({
      interval: this.client.config.xmppKeepAliveInterval,
    });

    this.setupEvents();

    this.client.debug('[XMPP] Connecting...');
    const connectionStartTime = Date.now();

    return new Promise<void>((res, rej) => {
      const timeout = setTimeout(() => {
        rej(new XMPPConnectionTimeoutError(this.client.config.xmppConnectionTimeout));
      }, this.client.config.xmppConnectionTimeout);

      this.connection!.once('session:started', () => {
        clearTimeout(timeout);
        this.client.debug(`[XMPP] Successfully connected (${((Date.now() - connectionStartTime) / 1000).toFixed(2)}s)`);
        this.connectionRetryCount = 0;

        if (sendStatusWhenConnected) this.client.setStatus();

        res();
      });

      this.connection?.once('stream:error', (err) => {
        clearTimeout(timeout);
        rej(new XMPPConnectionError(err));
      });

      this.connection!.connect();
    });
  }

  /**
   * Disconnects the XMPP client.
   * Also performs a cleanup
   */
  public disconnect() {
    this.metadataStore.clear();
    if (!this.connection) return;

    this.connection.disableKeepAlive();
    this.connection.removeAllListeners();
    this.connection.disconnect();
    this.connection = undefined;

    this.client.debug('[XMPP] Disconnected');
  }

  /**
   * Registers all events
   */
  private setupEvents() {
    this.connection!.on('disconnected', async () => {
      this.disconnect();

      if (this.connectionRetryCount >= this.client.config.xmppMaxConnectionRetries) {
        this.client.debug('[XMPP] Disconnected, reconnecting in 5 seconds...');
        this.connectionRetryCount += 1;

        await new Promise((res) => setTimeout(res, 5000));

        await this.connect();
        if (this.client.config.fetchFriends) await this.client.updateCaches();
        if (!this.client.config.disablePartyService) await this.client.initParty(this.client.config.createParty, this.client.config.forceNewParty);
      } else {
        this.client.debug('[XMPP] Disconnected, retry limit reached');

        await this.client.logout();
      }
    });

    this.connection!.on('raw:incoming', (raw) => this.client.debug(`IN ${raw}`, 'xmpp'));
    this.connection!.on('raw:outgoing', (raw) => this.client.debug(`OUT ${raw}`, 'xmpp'));

    this.connection!.on('message', async (m) => {
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
      } catch (err: any) {
        this.client.debug(`[XMPP] Error while processing ${body.type}: ${err.name} - ${err.message}`);
        this.client.emit('xmpp:message:error', err);
      }
    });
  }
}

export default XMPP;

import { randomUUID } from 'crypto';
import Endpoints from '../../resources/Endpoints';
import { AuthSessionStoreKey, RetryDecision } from '../../resources/enums';
import Base from '../Base';
import type {
  EOSPartyData, EOSPartyDataConfig, EOSPartyUserState, FortnitePartyConfig, FortnitePartyData,
} from '../../resources/structs';

/**
 * Typed REST boundary for EOS Party v2 and its linked Fortnite lobby bridge.
 */
class EOSPartyManager extends Base {
  public async getUserState(accountId = this.client.user.self!.id): Promise<EOSPartyUserState> {
    return this.client.http.epicgamesRequest({
      method: 'GET',
      url: `${Endpoints.EOS_PARTY_INTERNAL}/users/${accountId}`,
    }, AuthSessionStoreKey.FortniteEOS);
  }

  public async getParty(eosPartyId: string): Promise<EOSPartyData> {
    return this.client.http.epicgamesRequest({
      method: 'GET',
      url: `${Endpoints.EOS_PARTY_INTERNAL}/parties/${eosPartyId}`,
    }, AuthSessionStoreKey.FortniteEOS);
  }

  public async create(privateConnectionId: string, config: EOSPartyDataConfig): Promise<EOSPartyData> {
    return this.client.http.epicgamesRequest({
      method: 'POST',
      url: `${Endpoints.EOS_PARTY_INTERNAL}/parties`,
      headers: { 'Content-Type': 'application/json' },
      data: {
        join_info: {
          connection: {
            meta: { platform: this.client.config.platform, game: 'fn' },
            deployment_id: this.client.config.eosDeploymentId,
            id: privateConnectionId,
          },
        },
        config,
      },
    }, AuthSessionStoreKey.FortniteEOS);
  }

  public async patch(eosPartyId: string, data: Partial<EOSPartyData> & Pick<EOSPartyData, 'revision'>): Promise<EOSPartyData> {
    return this.client.http.epicgamesRequest(
      {
        method: 'PATCH',
        url: `${Endpoints.EOS_PARTY_INTERNAL}/parties/${eosPartyId}`,
        headers: { 'Content-Type': 'application/json' },
        data,
      },
      AuthSessionStoreKey.FortniteEOS,
      () => (this.client.party?.eosId === eosPartyId ? RetryDecision.Retry : RetryDecision.Abandon),
    );
  }

  public async join(eosPartyId: string, privateConnectionId: string): Promise<void> {
    await this.client.http.epicgamesRequest({
      method: 'POST',
      url: `${Endpoints.EOS_PARTY_INTERNAL}/parties/${eosPartyId}/members/${this.client.user.self!.id}/join`,
      headers: { 'Content-Type': 'application/json' },
      data: {
        connection: {
          meta: { platform: this.client.config.platform, game: 'fn' },
          deployment_id: this.client.config.eosDeploymentId,
          id: privateConnectionId,
        },
      },
    }, AuthSessionStoreKey.FortniteEOS);
  }

  public async connect(
    eosPartyId: string,
    publicConnectionId: string,
  ): Promise<void> {
    await this.client.http.epicgamesRequest(
      {
        method: 'POST',
        url: `${Endpoints.EOS_PARTY}/v2/${this.client.config.eosDeploymentId}/parties/${eosPartyId}/members/${this.client.user.self!.id}/connect`,
        headers: { 'Content-Type': 'application/json' },
        data: { connection_id: publicConnectionId, yield_leadership: false },
      },
      AuthSessionStoreKey.FortniteEOS,
      () => (this.client.party?.eosId === eosPartyId ? RetryDecision.Retry : RetryDecision.Abandon),
    );
  }

  public async keepAlive(eosPartyId: string): Promise<void> {
    await this.client.http.epicgamesRequest(
      {
        method: 'POST',
        url: `${Endpoints.EOS_PARTY_INTERNAL}/parties/${eosPartyId}/members/${this.client.user.self!.id}/keep-alive`,
        headers: { 'Content-Type': 'application/json' },
        data: {},
      },
      AuthSessionStoreKey.FortniteEOS,
      () => (this.client.party?.eosId === eosPartyId ? RetryDecision.Retry : RetryDecision.Abandon),
    );
  }

  public async removeMember(
    eosPartyId: string,
    accountId = this.client.user.self!.id,
  ): Promise<void> {
    await this.client.http.epicgamesRequest(
      {
        method: 'DELETE',
        url: `${Endpoints.EOS_PARTY_INTERNAL}/parties/${eosPartyId}/members/${accountId}`,
      },
      AuthSessionStoreKey.FortniteEOS,
      () => (this.client.party?.eosId === eosPartyId ? RetryDecision.Retry : RetryDecision.Abandon),
    );
  }

  public async promote(eosPartyId: string, accountId: string): Promise<void> {
    await this.client.http.epicgamesRequest(
      {
        method: 'POST',
        url: `${Endpoints.EOS_PARTY_INTERNAL}/parties/${eosPartyId}/members/${accountId}/promote`,
      },
      AuthSessionStoreKey.FortniteEOS,
      () => (this.client.party?.eosId === eosPartyId ? RetryDecision.Retry : RetryDecision.Abandon),
    );
  }

  public async invite(friendId: string): Promise<void> {
    await this.client.http.epicgamesRequest(
      {
        method: 'POST',
        url: `${Endpoints.EOS_PARTY_INTERNAL}/users/${friendId}/invites/${this.client.user.self!.id}?auto=false&platform=0`,
        headers: { 'Content-Type': 'application/json' },
        data: { guid: randomUUID().replaceAll('-', '').toUpperCase(), SocialMenuContext: 'Profile', epv: '1' },
      },
      AuthSessionStoreKey.FortniteEOS,
    );
  }

  public async sendJoinRequest(targetAccountId: string): Promise<void> {
    await this.client.http.epicgamesRequest({
      method: 'POST',
      url: `${Endpoints.EOS_PARTY_INTERNAL}/users/${targetAccountId}/joinRequests/${this.client.user.self!.id}?auto=false&platform=0`,
      headers: { 'Content-Type': 'application/json' },
      data: { guid: randomUUID().replaceAll('-', '').toUpperCase(), SocialMenuContext: 'Profile', epv: '1' },
    }, AuthSessionStoreKey.FortniteEOS);
  }

  public async deleteInvite(senderId: string): Promise<void> {
    await this.client.http.epicgamesRequest({
      method: 'DELETE',
      url: `${Endpoints.EOS_PARTY_INTERNAL}/users/${this.client.user.self!.id}/invites/${senderId}`,
    }, AuthSessionStoreKey.FortniteEOS);
  }

  public async declineJoinRequest(requesterId: string): Promise<void> {
    await this.client.http.epicgamesRequest({
      method: 'DELETE',
      url: `${Endpoints.EOS_PARTY_INTERNAL}/users/${this.client.user.self!.id}/joinRequests/${requesterId}`,
    }, AuthSessionStoreKey.FortniteEOS);
  }

  public async joinLobby(eosPartyId: string, lobbyId: string, partyConfig: FortnitePartyConfig): Promise<FortnitePartyData> {
    return this.client.http.epicgamesRequest({
      method: 'POST',
      url: `${Endpoints.BR_PARTY}/epic-parties/${eosPartyId}/lobbies/${lobbyId}/members/${this.client.user.self!.id}/join`,
      headers: { 'Content-Type': 'application/json' },
      data: {
        config: {
          discoverability: 'ALL',
          join_confirmation: partyConfig.joinConfirmation,
          joinability: 'OPEN',
          max_size: partyConfig.maxSize,
        },
        join_info: {
          connection: {
            id: this.client.xmpp.JID,
            meta: { 'urn:epic:conn:platform_s': this.client.config.platform },
          },
          meta: {
            CrossplayPreference_i: '1',
            SubGame_u: '1',
            'urn:epic:member:dn_s': this.client.user.self!.displayName,
          },
        },
      },
    }, AuthSessionStoreKey.Fortnite);
  }
}

export default EOSPartyManager;

const Endpoints = require('../../resources/Endpoints');

/**
 * A party invitation sent by the client's account
 */
class SentPartyInvitation {
  /**
   * @param {Object} client main client
   * @param {Object} party client's account party
   * @param {Object} receiver the receiver of the invitation
   * @param {Object} data the data of the invitation
   */
  constructor(client, party, receiver, data) {
    this.Client = client;
    this.party = party;
    this.receiver = receiver;
    this.createdAt = new Date(data.sent_at);
    this.expired = false;
  }

  /**
   * Cancels the sent party invitation
   */
  async cancel() {
    if (this.expired) throw new Error(`Failed canceling party ${this.party.id} invite for ${this.receiver.id}: The sent party invitation was already canceled or it expired`);
    const data = await this.Client.Http.send(true, 'DELETE',
      `${Endpoints.BR_PARTY}/parties/${this.party.id}/invites/${this.receiver.id}`, `bearer ${this.Client.Auth.auths.token}`);
    if (!data.success) throw new Error(`Failed canceling party ${this.party.id} invite for ${this.receiver.id}: ${this.Client.parseError(data.response)}`);
    this.expired = true;
  }

  /**
   * Resends the party invitation
   */
  async resend() {
    if (this.expired) throw new Error(`Failed resending party ${this.party.id} invite for ${this.receiver.id}: The sent party invitation was already canceled or it expired`);
    const data = await this.Client.Http.send(true, 'POST',
      `${Endpoints.BR_PARTY}/user/${this.receiver.id}/pings/${this.Client.account.id}`, `bearer ${this.Client.Auth.auths.token}`);
    if (!data.success) throw new Error(`Failed resending party ${this.party.id} invite for ${this.receiver.id}: ${this.Client.parseError(data.response)}`);
    this.expired = true;
  }
}

module.exports = SentPartyInvitation;

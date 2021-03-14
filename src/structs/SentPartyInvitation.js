const Endpoints = require('../../resources/Endpoints');

/**
 * Represents a party invitation sent by the client's user
 */
class SentPartyInvitation {
  /**
   * @param {Client} client The main client
   * @param {Party} party The invitation's party
   * @param {Friend} receiver The invitation's receiver
   * @param {Object} data The invitation's data
   */
  constructor(client, party, receiver, data) {
    this.client = client;

    /**
     * The party of this invitation
     * @type {Party}
     */
    this.party = party;

    /**
     * The friend who received this party invitation
     * @type {Friend}
     */
    this.receiver = receiver;

    /**
     * The Date when this party invitation was created
     * @type {Date}
     */
    this.createdAt = new Date(data.sent_at);

    /**
     * Whether this party invitation is expired or not
     * @type {boolean}
     */
    this.expired = false;

    this.client.once(`party#${this.party.id}:invite:declined`, () => {
      this.expired = true;
    });
  }

  /**
   * Cancels the party invitation
   * @returns {Promise<void>}
   */
  async cancel() {
    if (this.expired) throw new Error(`Failed canceling party ${this.party.id} invite for ${this.receiver.id}: The sent party invitation was already canceled, it expired or it was declined`);
    const data = await this.client.http.send(true, 'DELETE',
      `${Endpoints.BR_PARTY}/parties/${this.party.id}/invites/${this.receiver.id}`, 'fortnite');
    if (!data.success) throw new Error(`Failed canceling party ${this.party.id} invite for ${this.receiver.id}: ${this.client.parseError(data.response)}`);
    this.expired = true;
  }

  /**
   * Resends the party invitation
   * @returns {Promise<void>}
   */
  async resend() {
    if (this.expired) throw new Error(`Failed resending party ${this.party.id} invite for ${this.receiver.id}: The sent party invitation was already canceled, it expired or it was declined`);
    const data = await this.client.http.send(true, 'POST',
      `${Endpoints.BR_PARTY}/user/${this.receiver.id}/pings/${this.client.user.id}`, 'fortnite');
    if (!data.success) throw new Error(`Failed resending party ${this.party.id} invite for ${this.receiver.id}: ${this.client.parseError(data.response)}`);
    this.expired = true;
  }
}

module.exports = SentPartyInvitation;

const Meta = require('../Util/Meta');

/**
 * The clients presence meta
 * @extends {Meta}
 */
class ClientPresence extends Meta {
  /**
   * @param {Object} client main client
   */
  constructor(client) {
    super();

    Object.defineProperty(this, 'Client', { value: client });

    /**
     * The presence
     */
    this.schema = {
      Status: '',
      bIsPlaying: true,
      bIsJoinable: false,
      bHasVoiceSupport: false,
      SessionId: '',
    };
  }

  /**
   * Set the status and patch the presence via XMPP
   * @param {String} status the status to set
   */
  setStatus(status) {
    this.set('Status', status, true);
    return this.patch();
  }

  /**
   * Refresh the party presence
   */
  refreshPartyInfo() {
    const partyJoinInfoData = this.Client.party.config.privacy.presencePermission === 'None'
      || (this.Client.party.config.privacy.presencePermission === 'Leader' && this.Client.party.leader.id === this.Client.account.id)
      ? {
        bIsPrivate: true,
      } : {
        sourceId: this.Client.account.id,
        sourceDisplayName: this.Client.account.displayName,
        sourcePlatform: this.Client.config.platform.short,
        partyId: this.Client.party.id,
        partyTypeId: 286331153,
        key: 'k',
        appId: 'Fortnite',
        buildId: '1:1:',
        partyFlags: -2024557306,
        notAcceptingReason: 0,
        pc: this.Client.party.members.size,
      };
    const properties = {
      'party.joininfodata.286331153_j': partyJoinInfoData,
      FortBasicInfo_j: {
        homeBaseRating: 1,
      },
      FortLFG_I: '0',
      FortPartySize_i: 1,
      FortSubGame_i: 1,
      InUnjoinableMatch_b: false,
      FortGameplayStats_j: {
        state: '',
        playlist: 'None',
        numKills: 0,
        bFellToDeath: false,
      },
    };
    this.set('Properties', properties, false, true);
    if (this.schema.Status.startsWith('Battle Royale Lobby') || this.schema.Status === 'Playing Battle Royale') {
      this.set('Status', `Battle Royale Lobby - ${this.Client.party.members.size} / ${this.Client.party.config.maxSize}`, true);
    }
    return this.patch();
  }

  /**
   * Send the presence via XMPP
   */
  patch() {
    return this.Client.Xmpp.sendStatus(this.schema);
  }
}

module.exports = ClientPresence;

const PartyMember = require('./PartyMember');
const Endpoints = require('../../resources/Endpoints');

/**
 * The client in a party
 * @extends {PartyMember}
 */
class ClientPartyMember extends PartyMember {
  /**
   * @param {Object} party the party of this member
   * @param {Object} data this members data
   */
  constructor(party, data) {
    super(party, data);

    /**
     * If the client member is currently sending a patch.
     * Needed for revision
     */
    this.currentlyPatching = false;

    /**
     * Queue to push patches into while currentlyPatching is true
     * Needed for revision
     */
    this.patchQueue = [];

    /**
     * The revision of this member
     */
    this.revision = 0;

    if (this.Client.lastMemberMeta) this.meta.update(this.Client.lastMemberMeta, true);
  }

  /**
   * Set client readiness in party. NOTE: This is visually.
   * Matchmaking is a completely different thing
   * @param {Boolean} ready readiness
   */
  async setReadiness(ready) {
    await this.sendPatch({
      'Default:GameReadiness_s': this.meta.set('Default:GameReadiness_s', ready === true ? 'Ready' : 'NotReady'),
      'Default:ReadyInputType_s': this.meta.get('Default:CurrentInputType_s'),
    });
  }

  /**
   * Set the level of the client in party
   * @param {Number} level level
   */
  async setLevel(level) {
    let loadout = this.meta.get('Default:AthenaBannerInfo_j');
    loadout = this.meta.set('Default:AthenaBannerInfo_j', {
      ...loadout,
      AthenaBannerInfo: {
        ...loadout.AthenaBannerInfo,
        seasonLevel: level,
      },
    });
    await this.sendPatch({
      'Default:AthenaBannerInfo_j': loadout,
    });
  }

  /**
   * Set the battlepass info of the client in party
   * @param {Boolean} isPurchased if the pass was purchased
   * @param {Number} level the pass level
   * @param {Number} selfBoost the self boost %
   * @param {Number} friendBoost the friend boost %
   */
  async setBattlepass(isPurchased, level, selfBoost, friendBoost) {
    let loadout = this.meta.get('Default:BattlePassInfo_j');
    loadout = this.meta.set('Default:BattlePassInfo_j', {
      ...loadout,
      BattlePassInfo: {
        ...loadout.BattlePassInfo,
        bHasPurchasedPass: typeof isPurchased === 'boolean' ? isPurchased : loadout.BattlePassInfo.bHasPurchasedPass,
        passLevel: typeof level === 'number' ? level : loadout.BattlePassInfo.passLevel,
        selfBoostXp: typeof selfBoost === 'number' ? selfBoost : loadout.BattlePassInfo.selfBoostXp,
        friendBoostXp: typeof friendBoost === 'number' ? friendBoost : loadout.BattlePassInfo.friendBoostXp,
      },
    });
    await this.sendPatch({
      'Default:BattlePassInfo_j': loadout,
    });
  }

  /**
   * Set the clients banner in party
   * @param {String} banner bannerid
   * @param {String} color color (number)
   */
  async setBanner(banner, color) {
    let loadout = this.meta.get('Default:AthenaBannerInfo_j');
    loadout = this.meta.set('Default:AthenaBannerInfo_j', {
      ...loadout,
      AthenaBannerInfo: {
        ...loadout.AthenaBannerInfo,
        bannerIconId: banner,
        bannerColorId: color,
      },
    });
    await this.sendPatch({
      'Default:AthenaBannerInfo_j': loadout,
    });
  }

  /**
   * Set the clients outfit in party
   * @param {String} cid id of the outfit
   * @param {Array} variants skin variants
   * @param {Array} enlightment skin enlightment
   */
  async setOutfit(cid, variants = [], enlightment = []) {
    let loadout = this.meta.get('Default:AthenaCosmeticLoadout_j');

    const parsedVariants = [];
    variants.forEach((v) => {
      parsedVariants.push({ item: 'AthenaCharacter', ...v });
    });

    loadout.AthenaCosmeticLoadout.variants.forEach((v) => {
      if (v.item !== 'AthenaCharacter') parsedVariants.push(v);
    });

    const scratchpad = [];
    if (enlightment.length === 2) {
      scratchpad.push({
        t: enlightment[0],
        v: enlightment[1],
      });
    }

    loadout = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...loadout,
      AthenaCosmeticLoadout: {
        ...loadout.AthenaCosmeticLoadout,
        characterDef: `/Game/Athena/Items/Cosmetics/Characters/${cid}.${cid}`,
        variants: parsedVariants,
        scratchpad,
      },
    });
    await this.sendPatch({
      'Default:AthenaCosmeticLoadout_j': loadout,
    });
  }

  /**
   * Set the clients backpack in party
   * @param {String} bid id of the backpack
   */
  async setBackpack(bid, variants = []) {
    let loadout = this.meta.get('Default:AthenaCosmeticLoadout_j');

    const parsedVariants = [];
    variants.forEach((v) => {
      parsedVariants.push({ item: 'AthenaBackpack', ...v });
    });

    loadout.AthenaCosmeticLoadout.variants.forEach((v) => {
      if (v.item !== 'AthenaBackpack') parsedVariants.push(v);
    });

    loadout = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...loadout,
      AthenaCosmeticLoadout: {
        ...loadout.AthenaCosmeticLoadout,
        backpackDef: `/Game/Athena/Items/Cosmetics/Backpacks/${bid}.${bid}`,
        variants: parsedVariants,
      },
    });
    await this.sendPatch({
      'Default:AthenaCosmeticLoadout_j': loadout,
    });
  }

  /**
   * Set the clients pickaxe in party
   * @param {String} pickaxe id of the pickaxe
   */
  async setPickaxe(pickaxe, variants = []) {
    let loadout = this.meta.get('Default:AthenaCosmeticLoadout_j');

    const parsedVariants = [];
    variants.forEach((v) => {
      parsedVariants.push({ item: 'AthenaPickaxe', ...v });
    });

    loadout.AthenaCosmeticLoadout.variants.forEach((v) => {
      if (v.item !== 'AthenaPickaxe') parsedVariants.push(v);
    });

    loadout = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...loadout,
      AthenaCosmeticLoadout: {
        ...loadout.AthenaCosmeticLoadout,
        pickaxeDef: `/Game/Athena/Items/Cosmetics/Pickaxes/${pickaxe}.${pickaxe}`,
        variants: parsedVariants,
      },
    });
    await this.sendPatch({
      'Default:AthenaCosmeticLoadout_j': loadout,
    });
  }

  /**
   * Set the clients emote in party
   * @param {String} eid id of the emote
   */
  async setEmote(eid) {
    let loadout = this.meta.get('Default:FrontendEmote_j');
    loadout = this.meta.set('Default:FrontendEmote_j', {
      ...loadout,
      FrontendEmote: {
        ...loadout.FrontendEmote,
        emoteItemDef: `/Game/Athena/Items/Cosmetics/Dances/${eid}.${eid}`,
        emoteSection: -2,
      },
    });
    await this.sendPatch({
      'Default:FrontendEmote_j': loadout,
    });
  }

  /**
   * Clears the clients emote in party
   */
  async clearEmote() {
    let loadout = this.meta.get('Default:FrontendEmote_j');
    loadout = this.meta.set('Default:FrontendEmote_j', {
      ...loadout,
      FrontendEmote: {
        ...loadout.FrontendEmote,
        emoteItemDef: 'None',
        emoteSection: -1,
      },
    });
    await this.sendPatch({
      'Default:FrontendEmote_j': loadout,
    });
  }

  /**
   * Send a patch with the latest meta
   * @param {Object} updated updated data
   * @param {Boolean} isForced if the patch should ignore current patches
   */
  async sendPatch(updated, isForced) {
    if (!isForced && this.currentlyPatching) {
      this.patchQueue.push([updated]);
      return;
    }
    this.currentlyPatching = true;

    const patch = await this.Client.Http.send(true, 'PATCH',
      `${Endpoints.BR_PARTY}/parties/${this.Party.id}/members/${this.id}/meta`, `bearer ${this.Client.Auth.auths.token}`, null, {
        delete: [],
        revision: parseInt(this.revision, 10),
        update: updated || this.meta.schema,
      });
    if (patch.success) {
      this.revision += 1;
    } else {
      switch (patch.response.errorCode) {
        case 'errors.com.epicgames.social.party.stale_revision':
          [, this.revision] = patch.response.messageVars;
          this.patchQueue.push([updated]);
          break;
        default: break;
      }
    }

    if (this.patchQueue.length > 0) {
      const args = this.patchQueue.shift();
      this.sendPatch(...args, true);
    } else {
      this.currentlyPatching = false;
    }
    if (this.Client.config.savePartyMemberMeta) this.Client.lastMemberMeta = this.meta.schema;
  }
}

module.exports = ClientPartyMember;

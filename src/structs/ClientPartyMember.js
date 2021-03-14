/* eslint-disable max-len */
const PartyMember = require('./PartyMember');
const Endpoints = require('../../resources/Endpoints');

/**
 * Represents the party member of a client
 * @extends {PartyMember}
 */
class ClientPartyMember extends PartyMember {
  /**
   * @param {Object} party The member's party
   * @param {Object} data The party member's data
   */
  constructor(party, data) {
    super(party, data);

    /**
     * Whether the client's party member is currently sending a patch
     * @type {boolean}
     */
    this.currentlyPatching = false;

    /**
     * Queue to push patches into while currentlyPatching is true
     * @type {Array}
     */
    this.patchQueue = [];

    /**
     * The revision of the client's party member
     * @type {number}
     */
    this.revision = 0;

    if (this.client.lastMemberMeta) this.meta.update(this.client.lastMemberMeta, true);
  }

  /**
   * Sets the readiness of the client's party member
   * @param {boolean} ready Whether the party member should be ready or not
   * @returns {Promise<void>}
   */
  async setReadiness(ready) {
    await this.sendPatch({
      'Default:GameReadiness_s': this.meta.set('Default:GameReadiness_s', ready ? 'Ready' : 'NotReady'),
      'Default:ReadyInputType_s': this.meta.get('Default:CurrentInputType_s'),
    });
  }

  /**
   * Sets the sitting out state of the client's party member
   * @param {boolean} sittingOut Whether the party member should be sitting out or not
   * @returns {Promise<void>}
   */
  async setSittingOut(sittingOut) {
    await this.sendPatch({
      'Default:GameReadiness_s': this.meta.set('Default:GameReadiness_s', sittingOut ? 'SittingOut' : 'NotReady'),
    });
  }

  /**
   * Sets the level of the client's party member
   * @param {number} level The level that will be set
   * @returns {Promise<void>}
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
   * Sets the Battle Pass info of the party member
   * @param {boolean} isPurchased Whether the Battle Pass was purchased or not
   * @param {number} level The Battle Pass level
   * @param {number} selfBoost The self boost percent
   * @param {number} friendBoost The friend boost percent
   * @returns {Promise<void>}
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
   * Sets party member's banner
   * @param {string} banner The banner's id
   * @param {string} color The banner color
   * @type {Promise<void>}
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
   * Sets the party member's outfit
   * @param {string} cid The skin's id
   * @param {Array} [variants=[]] The skin's variants
   * @param {Array} [enlightment=[]] The skin's enlightment
   * @returns {Promise<void>}
   * @example
   * client.party.me.setOutfit('CID_028_Athena_Commando_F');
   * // with variants:
   * client.party.me.setOutfit('CID_029_Athena_Commando_F_Halloween', [{ channel: 'Material', variant: 'Mat3' }]);
   * // with enlightment:
   * client.party.me.setOutfit('CID_701_Athena_Commando_M_BananaAgent', [{ channel: 'Progressive', variant: 'Stage4' }], [2, 350]);
   */
  async setOutfit(cid, variants = [], enlightment = []) {
    let loadout = this.meta.get('Default:AthenaCosmeticLoadout_j');
    let variantLoadout = this.meta.get('Default:AthenaCosmeticLoadoutVariants_j');

    const patches = {};

    const parsedVariants = { AthenaCharacter: { i: [] } };
    variants.forEach((v) => {
      parsedVariants.AthenaCharacter.i.push({ c: v.c || v.channel, v: v.v || v.variant, dE: v.dE || 0 });
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
        scratchpad,
      },
    });
    patches['Default:AthenaCosmeticLoadout_j'] = loadout;

    delete variantLoadout.AthenaCosmeticLoadoutVariants.vL.AthenaCharacter;
    if (parsedVariants.AthenaCharacter.i[0]) {
      variantLoadout = this.meta.set('Default:AthenaCosmeticLoadoutVariants_j', {
        ...variantLoadout,
        AthenaCosmeticLoadoutVariants: {
          ...variantLoadout.AthenaCosmeticLoadoutVariants,
          vL: {
            ...variantLoadout.AthenaCosmeticLoadoutVariants.vL,
            ...parsedVariants,
          },
        },
      });
      patches['Default:AthenaCosmeticLoadoutVariants_j'] = variantLoadout;
    }

    await this.sendPatch(patches);
  }

  /**
   * Sets the party member's backpack
   * @param {string} bid The backpack's id
   * @param {Array} [variants=[]] The backpack's variants
   * @returns {Promise<void>}
   * @example
   * client.party.me.setBackpack('BID_001_BlueSquire');
   * // with variants
   * client.party.me.setBackpack('BID_105_GhostPortal', [{ channel: 'Particle', variant: 'Particle1' }]);
   */
  async setBackpack(bid, variants = []) {
    let loadout = this.meta.get('Default:AthenaCosmeticLoadout_j');
    let variantLoadout = this.meta.get('Default:AthenaCosmeticLoadoutVariants_j');

    const patches = {};

    const parsedVariants = { AthenaBackpack: { i: [] } };
    variants.forEach((v) => {
      parsedVariants.AthenaBackpack.i.push({ c: v.c || v.channel, v: v.v || v.variant, dE: v.dE || 0 });
    });

    loadout = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...loadout,
      AthenaCosmeticLoadout: {
        ...loadout.AthenaCosmeticLoadout,
        backpackDef: `/Game/Athena/Items/Cosmetics/Backpacks/${bid}.${bid}`,
      },
    });
    patches['Default:AthenaCosmeticLoadout_j'] = loadout;

    delete variantLoadout.AthenaCosmeticLoadoutVariants.vL.AthenaBackpack;
    if (parsedVariants.AthenaBackpack.i[0]) {
      variantLoadout = this.meta.set('Default:AthenaCosmeticLoadoutVariants_j', {
        ...variantLoadout,
        AthenaCosmeticLoadoutVariants: {
          ...variantLoadout.AthenaCosmeticLoadoutVariants,
          vL: {
            ...variantLoadout.AthenaCosmeticLoadoutVariants.vL,
            ...parsedVariants,
          },
        },
      });
      patches['Default:AthenaCosmeticLoadoutVariants_j'] = variantLoadout;
    }

    await this.sendPatch(patches);
  }

  /**
   * Sets the party member's pickaxe
   * @param {string} pickaxe The pickaxe's id
   * @param {Array} [variants=[]] The pickaxe's variants
   * @returns {Promise<void>}
   * @example
   * client.party.me.setPickaxe('Pickaxe_ID_011_Medieval');
   * // with variants
   * client.party.me.setPickaxe('Pickaxe_ID_109_SkullTrooper', [{ channel: 'Material', variant: 'Mat2' }]);
   */
  async setPickaxe(pickaxe, variants = []) {
    let loadout = this.meta.get('Default:AthenaCosmeticLoadout_j');
    let variantLoadout = this.meta.get('Default:AthenaCosmeticLoadoutVariants_j');

    const patches = {};

    const parsedVariants = { AthenaPickaxe: { i: [] } };
    variants.forEach((v) => {
      parsedVariants.AthenaPickaxe.i.push({ c: v.c || v.channel, v: v.v || v.variant, dE: v.dE || 0 });
    });

    loadout = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...loadout,
      AthenaCosmeticLoadout: {
        ...loadout.AthenaCosmeticLoadout,
        pickaxeDef: `/Game/Athena/Items/Cosmetics/Pickaxes/${pickaxe}.${pickaxe}`,
      },
    });
    patches['Default:AthenaCosmeticLoadout_j'] = loadout;

    delete variantLoadout.AthenaCosmeticLoadoutVariants.vL.AthenaPickaxe;
    if (parsedVariants.AthenaPickaxe.i[0]) {
      variantLoadout = this.meta.set('Default:AthenaCosmeticLoadoutVariants_j', {
        ...variantLoadout,
        AthenaCosmeticLoadoutVariants: {
          ...variantLoadout.AthenaCosmeticLoadoutVariants,
          vL: {
            ...variantLoadout.AthenaCosmeticLoadoutVariants.vL,
            ...parsedVariants,
          },
        },
      });
      patches['Default:AthenaCosmeticLoadoutVariants_j'] = variantLoadout;
    }

    await this.sendPatch(patches);
  }

  /**
   * Sets the party member's emote
   * @param {string} eid The emote's id
   * @returns {Promise<void>}
   */
  async setEmote(eid) {
    if (this.meta.get('Default:FrontendEmote_j').FrontendEmote.emoteItemDef !== 'None') await this.clearEmote();
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
   * Sets the party member's emoji
   * @param {string} emoji The emoji's id
   * @returns {Promise<void>}
   */
  async setEmoji(emoji) {
    if (this.meta.get('Default:FrontendEmote_j').FrontendEmote.emoteItemDef !== 'None') await this.clearEmote();
    let loadout = this.meta.get('Default:FrontendEmote_j');
    loadout = this.meta.set('Default:FrontendEmote_j', {
      ...loadout,
      FrontendEmote: {
        ...loadout.FrontendEmote,
        emoteItemDef: `/Game/Athena/Items/Cosmetics/Dances/Emoji/${emoji}.${emoji}`,
        emoteSection: -2,
      },
    });
    await this.sendPatch({
      'Default:FrontendEmote_j': loadout,
    });
  }

  /**
   * Clears the party member's emote
   * @returns {Promise<void>}
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
   * Clears the party member's backpack
   * @returns {Promise<void>}
   */
  async clearBackpack() {
    let loadout = this.meta.get('Default:AthenaCosmeticLoadout_j');
    loadout = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...loadout,
      AthenaCosmeticLoadout: {
        ...loadout.AthenaCosmeticLoadout,
        backpackDef: '',
      },
    });
    await this.sendPatch({
      'Default:AthenaCosmeticLoadout_j': loadout,
    });
  }

  /**
   * Show the client as "in a match" in party
   * Visually, doesn't actually join a match
   * @param {?boolean} isPlaying Whether the client is playing or not
   * @param {?number} playerCount Match player count (must be between 0 and 255)
   * @param {?string} startedAt When the match started (ISO date string)
   */
  async setPlaying(isPlaying = true, playerCount = 100, startedAt = new Date().toISOString()) {
    if (!Number.isInteger(playerCount)) throw new TypeError('playerCount must be an integer');
    if (playerCount < 0 || playerCount > 255) throw new RangeError('playerCount must be between 0 and 255');
    if (typeof startedAt !== 'string') throw new TypeError('startedAt must be a string');

    await this.sendPatch({
      'Default:Location_s': this.meta.set('Default:Location_s', isPlaying ? 'InGame' : 'PreLobby'),
      'Default:HasPreloadedAthena_b': this.meta.set('Default:HasPreloadedAthena_b', isPlaying),
      'Default:SpectateAPartyMemberAvailable_b': this.meta.set('Default:SpectateAPartyMemberAvailable_b', isPlaying),
      'Default:NumAthenaPlayersLeft_U': this.meta.set('Default:NumAthenaPlayersLeft_U', playerCount),
      'Default:UtcTimeStartedMatchAthena_s': this.meta.set('Default:UtcTimeStartedMatchAthena_s', startedAt),
    });
  }

  /**
   * Sends a patch with the latest meta
   * @param {Object} updated The updated data
   * @param {Boolean} isForced Whether the patch should ignore current patches
   * @returns {Promise<void>}
   * @private
   */
  async sendPatch(updated, isForced) {
    if (!isForced && this.currentlyPatching) {
      this.patchQueue.push([updated]);
      return;
    }

    this.currentlyPatching = true;

    const patch = await this.client.http.send(true, 'PATCH',
      `${Endpoints.BR_PARTY}/parties/${this.party.id}/members/${this.id}/meta`, 'fortnite', null, {
        delete: [],
        revision: this.revision,
        update: updated || this.meta.schema,
      });

    if (patch.success) this.revision += 1;
    else if (patch.response.errorCode === 'errors.com.epicgames.social.party.stale_revision') {
      this.revision = parseInt(patch.response.messageVars[1], 10);
      this.patchQueue.unshift([updated]);
    }

    if (this.patchQueue.length > 0) {
      const [nextUpdated] = this.patchQueue.shift();
      this.sendPatch(nextUpdated, true);
    } else this.currentlyPatching = false;

    if (this.client.config.savePartyMemberMeta) this.client.lastMemberMeta = this.meta.schema;
  }
}

module.exports = ClientPartyMember;

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
   * @param level level
   */
  async setLevel(level) {
    const data = {
      seasonLevel: level,
    };
    let loadout = this.meta.get('Default:AthenaBannerInfo_j');
    loadout = this.meta.set('Default:AthenaBannerInfo_j', {
      ...loadout,
      AthenaBannerInfo: {
        ...loadout.AthenaBannerInfo,
        ...data,
      },
    });
    await this.sendPatch({
      'Default:AthenaBannerInfo_j': loadout,
    });
  }

  /**
   * Set the clients banner in party
   * @param banner bannerid
   * @param color color (number)
   */
  async setBanner(banner, color) {
    const data = {
      bannerIconId: banner,
      bannerColorId: color,
    };
    let loadout = this.meta.get('Default:AthenaBannerInfo_j');
    loadout = this.meta.set('Default:AthenaBannerInfo_j', {
      ...loadout,
      AthenaBannerInfo: {
        ...loadout.AthenaBannerInfo,
        ...data,
      },
    });
    await this.sendPatch({
      'Default:AthenaBannerInfo_j': loadout,
    });
  }

  /**
   * Set the clients outfit in party
   * @param cid id of the outfit
   */
  async setOutfit(cid) {
    const data = {
      characterDef: `/Game/Athena/Items/Cosmetics/Characters/${cid}.${cid}`,
    };
    let loadout = this.meta.get('Default:AthenaCosmeticLoadout_j');
    loadout = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...loadout,
      AthenaCosmeticLoadout: {
        ...loadout.AthenaCosmeticLoadout,
        ...data,
      },
    });
    await this.sendPatch({
      'Default:AthenaCosmeticLoadout_j': loadout,
    });
  }

  /**
   * Set the clients backpack in party
   * @param bid id of the backpack
   */
  async setBackpack(bid) {
    const data = {
      backpackDef: `/Game/Athena/Items/Cosmetics/Backpacks/${bid}.${bid}`,
    };
    let loadout = this.meta.get('Default:AthenaCosmeticLoadout_j');
    loadout = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...loadout,
      AthenaCosmeticLoadout: {
        ...loadout.AthenaCosmeticLoadout,
        ...data,
      },
    });
    await this.sendPatch({
      'Default:AthenaCosmeticLoadout_j': loadout,
    });
  }

  /**
   * Set the clients pickaxe in party
   * @param pickaxe id of the pickaxe
   */
  async setPickaxe(pickaxe) {
    const data = {
      pickaxeDef: `/Game/Athena/Items/Cosmetics/Pickaxes/${pickaxe}.${pickaxe}`,
    };
    let loadout = this.meta.get('Default:AthenaCosmeticLoadout_j');
    loadout = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...loadout,
      AthenaCosmeticLoadout: {
        ...loadout.AthenaCosmeticLoadout,
        ...data,
      },
    });
    await this.sendPatch({
      'Default:AthenaCosmeticLoadout_j': loadout,
    });
  }

  /**
   * Set the clients emote in party
   * @param eid id of the emote
   */
  async setEmote(eid) {
    const data = {
      emoteItemDef: `/Game/Athena/Items/Cosmetics/Dances/${eid}.${eid}`,
    };
    let loadout = this.meta.get('Default:FrontendEmote_j');
    loadout = this.meta.set('Default:FrontendEmote_j', {
      ...loadout,
      FrontendEmote: {
        ...loadout.FrontendEmote,
        ...data,
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
    const data = {
      emoteItemDef: 'None',
    };
    let loadout = this.meta.get('Default:FrontendEmote_j');
    loadout = this.meta.set('Default:FrontendEmote_j', {
      ...loadout,
      FrontendEmote: {
        ...loadout.FrontendEmote,
        ...data,
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
        default: return;
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

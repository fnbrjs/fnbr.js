import { AsyncQueue } from '@sapphire/async-queue';
import Endpoints from '../../../resources/Endpoints';
import ClientPartyMemberMeta from './ClientPartyMemberMeta';
import PartyMember from './PartyMember';
import type {
  CosmeticEnlightment, CosmeticsVariantMeta, CosmeticVariant, PartyMemberData, PartyMemberSchema, Schema,
} from '../../../resources/structs';
import type Party from './Party';

/**
 * Represents the client's party member
 */
class ClientPartyMember extends PartyMember {
  /**
   * The patch queue
   */
  private patchQueue: AsyncQueue;

  /**
   * The member's meta
   */
  public meta: ClientPartyMemberMeta;

  /**
   * @param party The party this member belongs to
   * @param data The member data
   */
  constructor(party: Party, data: PartyMemberData) {
    super(party, data);

    this.meta = new ClientPartyMemberMeta(this, data.meta);
    this.patchQueue = new AsyncQueue();

    this.update({ id: this.id, displayName: this.client.user?.displayName, externalAuths: this.client.user?.externalAuths });

    if (this.client.lastPartyMemberMeta) this.meta.update(this.client.lastPartyMemberMeta, true);
  }

  /**
   * Sends a meta patch to Epicgames's servers
   * @param updated The updated schema
   * @throws {EpicgamesAPIError}
   */
  public async sendPatch(updated: PartyMemberSchema): Promise<void> {
    await this.patchQueue.wait();

    const patch = await this.client.http.sendEpicgamesRequest(
      true,
      'PATCH',
      `${Endpoints.BR_PARTY}/parties/${this.party.id}/members/${this.id}/meta`,
      'fortnite',
      {
        'Content-Type': 'application/json',
      },
      {
        delete: [],
        revision: this.revision,
        update: updated,
      },
    );

    if (patch.error) {
      if (patch.error.code === 'errors.com.epicgames.social.party.stale_revision') {
        this.revision = parseInt(patch.error.messageVars[1], 10);
        this.patchQueue.shift();
        return this.sendPatch(updated);
      }

      this.patchQueue.shift();

      throw patch.error;
    }

    this.revision += 1;
    this.patchQueue.shift();

    if (this.client.config.savePartyMemberMeta) this.client.lastPartyMemberMeta = this.meta.schema;

    return undefined;
  }

  /**
   * Updates the client party member's readiness
   * @param ready Whether the client party member is ready
   * @throws {EpicgamesAPIError}
   */
  public async setReadiness(ready: boolean) {
    let data = this.meta.get('Default:LobbyState_j');
    data = this.meta.set('Default:LobbyState_j', {
      ...data,
      LobbyState: {
        gameReadiness: ready ? 'Ready' : 'NotReady',
      },
    });

    await this.sendPatch({
      'Default:LobbyState_j': data,
    });
  }

  /**
   * Updates the client party member's sitting out state
   * @param sittingOut Whether the client party member is sitting out
   * @throws {EpicgamesAPIError}
   */
  public async setSittingOut(sittingOut: boolean) {
    let data = this.meta.get('Default:LobbyState_j');
    data = this.meta.set('Default:LobbyState_j', {
      ...data,
      LobbyState: {
        gameReadiness: sittingOut ? 'SittingOut' : 'NotReady',
      },
    });

    await this.sendPatch({
      'Default:LobbyState_j': data,
    });
  }

  /**
   * Updates the client party member's level
   * @param level The new level
   * @throws {EpicgamesAPIError}
   */
  public async setLevel(level: number) {
    let data = this.meta.get('Default:AthenaBannerInfo_j');
    data = this.meta.set('Default:AthenaBannerInfo_j', {
      ...data,
      AthenaBannerInfo: {
        ...data.AthenaBannerInfo,
        seasonLevel: level,
      },
    });

    await this.sendPatch({
      'Default:AthenaBannerInfo_j': data,
    });
  }

  /**
   * Updates the client party member's battle pass info
   * @param isPurchased Whether the battle pass is purchased
   * @param level The battle pass level
   * @param selfBoost The battle pass self boost percentage
   * @param friendBoost The battle pass friend boost percentage
   * @throws {EpicgamesAPIError}
   */
  public async setBattlePass(isPurchased: boolean, level: number, selfBoost: number, friendBoost: number) {
    let data = this.meta.get('Default:BattlePassInfo_j');
    data = this.meta.set('Default:BattlePassInfo_j', {
      ...data,
      BattlePassInfo: {
        ...data.BattlePassInfo,
        bHasPurchasedPass: typeof isPurchased === 'boolean' ? isPurchased : data.BattlePassInfo.bHasPurchasedPass,
        passLevel: typeof level === 'number' ? level : data.BattlePassInfo.passLevel,
        selfBoostXp: typeof selfBoost === 'number' ? selfBoost : data.BattlePassInfo.selfBoostXp,
        friendBoostXp: typeof friendBoost === 'number' ? friendBoost : data.BattlePassInfo.friendBoostXp,
      },
    });

    await this.sendPatch({
      'Default:BattlePassInfo_j': data,
    });
  }

  /**
   * Updates the client party member's banner
   * @param bannerId The new banner's id
   * @param color The new banner's color
   * @throws {EpicgamesAPIError}
   */
  public async setBanner(bannerId: string, color: string) {
    let data = this.meta.get('Default:AthenaBannerInfo_j');
    data = this.meta.set('Default:AthenaBannerInfo_j', {
      ...data,
      AthenaBannerInfo: {
        ...data.AthenaBannerInfo,
        bannerIconId: bannerId,
        bannerColorId: color,
      },
    });

    await this.sendPatch({
      'Default:AthenaBannerInfo_j': data,
    });
  }

  /**
   * Updates the client party member's outfit
   * @param cid The outfit's CID
   * @param variants The outfit's variants
   * @param enlightment The outfit's enlighment
   * @throws {EpicgamesAPIError}
   */
  public async setOutfit(cid: string, variants: CosmeticVariant[] = [], enlightment: CosmeticEnlightment | [] = []) {
    let data = this.meta.get('Default:AthenaCosmeticLoadout_j');
    let variantData = this.meta.get('Default:AthenaCosmeticLoadoutVariants_j');

    const patches: Schema = {};

    const parsedVariants: CosmeticsVariantMeta = {
      AthenaCharacter: {
        i: variants.map((v) => ({
          v: v.variant,
          c: v.channel,
          dE: v.dE || 0,
        })),
      },
    };

    const scratchpad = [];
    if (enlightment.length === 2) {
      scratchpad.push({
        t: enlightment[0],
        v: enlightment[1],
      });
    }

    data = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...data,
      AthenaCosmeticLoadout: {
        ...data.AthenaCosmeticLoadout,
        characterDef: `/Game/Athena/Items/Cosmetics/Characters/${cid}.${cid}`,
        scratchpad,
      },
    });

    patches['Default:AthenaCosmeticLoadout_j'] = data;

    delete variantData.AthenaCosmeticLoadoutVariants.vL.AthenaCharacter;
    if (parsedVariants.AthenaCharacter?.i[0]) {
      variantData = this.meta.set('Default:AthenaCosmeticLoadoutVariants_j', {
        AthenaCosmeticLoadoutVariants: {
          vL: {
            ...variantData.AthenaCosmeticLoadoutVariants.vL,
            ...parsedVariants,
          },
        },
      });

      patches['Default:AthenaCosmeticLoadoutVariants_j'] = variantData;
    }

    await this.sendPatch(patches);
  }

  /**
   * Updates the client party member's backpack
   * @param bid The backpack's BID
   * @param variants The backpack's variants
   * @throws {EpicgamesAPIError}
   */
  public async setBackpack(bid: string, variants: CosmeticVariant[] = []) {
    let data = this.meta.get('Default:AthenaCosmeticLoadout_j');
    let variantData = this.meta.get('Default:AthenaCosmeticLoadoutVariants_j');

    const patches: Schema = {};

    const parsedVariants: CosmeticsVariantMeta = {
      AthenaBackpack: {
        i: variants.map((v) => ({
          v: v.variant,
          c: v.channel,
          dE: v.dE || 0,
        })),
      },
    };

    data = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...data,
      AthenaCosmeticLoadout: {
        ...data.AthenaCosmeticLoadout,
        backpackDef: `/Game/Athena/Items/Cosmetics/Backpacks/${bid}.${bid}`,
      },
    });

    patches['Default:AthenaCosmeticLoadout_j'] = data;

    delete variantData.AthenaCosmeticLoadoutVariants.vL.AthenaBackpack;
    if (parsedVariants.AthenaBackpack?.i[0]) {
      variantData = this.meta.set('Default:AthenaCosmeticLoadoutVariants_j', {
        AthenaCosmeticLoadoutVariants: {
          vL: {
            ...variantData.AthenaCosmeticLoadoutVariants.vL,
            ...parsedVariants,
          },
        },
      });

      patches['Default:AthenaCosmeticLoadoutVariants_j'] = variantData;
    }

    await this.sendPatch(patches);
  }

  /**
   * Updates the client party member's pet
   * @param id The pet's ID
   * @param variants The pet's variants
   */
  public async setPet(id: string, variants: CosmeticVariant[] = []) {
    let data = this.meta.get('Default:AthenaCosmeticLoadout_j');
    let variantData = this.meta.get('Default:AthenaCosmeticLoadoutVariants_j');

    const patches: Schema = {};

    const parsedVariants: CosmeticsVariantMeta = {
      AthenaBackpack: {
        i: variants.map((v) => ({
          v: v.variant,
          c: v.channel,
          dE: v.dE || 0,
        })),
      },
    };

    data = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...data,
      AthenaCosmeticLoadout: {
        ...data.AthenaCosmeticLoadout,
        backpackDef: `/Game/Athena/Items/Cosmetics/PetCarriers/${id}.${id}`,
      },
    });

    patches['Default:AthenaCosmeticLoadout_j'] = data;

    delete variantData.AthenaCosmeticLoadoutVariants.vL.AthenaBackpack;
    if (parsedVariants.AthenaBackpack?.i[0]) {
      variantData = this.meta.set('Default:AthenaCosmeticLoadoutVariants_j', {
        AthenaCosmeticLoadoutVariants: {
          vL: {
            ...variantData.AthenaCosmeticLoadoutVariants.vL,
            ...parsedVariants,
          },
        },
      });

      patches['Default:AthenaCosmeticLoadoutVariants_j'] = variantData;
    }

    await this.sendPatch(patches);
  }

  /**
   * Updates the client party member's pickaxe
   * @param id The pickaxe's ID
   * @param variants The pickaxe's variants
   * @throws {EpicgamesAPIError}
   */
  public async setPickaxe(id: string, variants: CosmeticVariant[] = []) {
    let data = this.meta.get('Default:AthenaCosmeticLoadout_j');
    let variantData = this.meta.get('Default:AthenaCosmeticLoadoutVariants_j');

    const patches: Schema = {};

    const parsedVariants: CosmeticsVariantMeta = {
      AthenaPickaxe: {
        i: variants.map((v) => ({
          v: v.variant,
          c: v.channel,
          dE: v.dE || 0,
        })),
      },
    };

    data = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...data,
      AthenaCosmeticLoadout: {
        ...data.AthenaCosmeticLoadout,
        pickaxeDef: `/Game/Athena/Items/Cosmetics/Pickaxes/${id}.${id}`,
      },
    });

    patches['Default:AthenaCosmeticLoadout_j'] = data;

    delete variantData.AthenaCosmeticLoadoutVariants.vL.AthenaPickaxe;
    if (parsedVariants.AthenaPickaxe?.i[0]) {
      variantData = this.meta.set('Default:AthenaCosmeticLoadoutVariants_j', {
        AthenaCosmeticLoadoutVariants: {
          vL: {
            ...variantData.AthenaCosmeticLoadoutVariants.vL,
            ...parsedVariants,
          },
        },
      });

      patches['Default:AthenaCosmeticLoadoutVariants_j'] = variantData;
    }

    await this.sendPatch(patches);
  }

  /**
   * Updates the client party member's emote
   * @param eid The emote's EID
   * @throws {EpicgamesAPIError}
   */
  public async setEmote(eid: string) {
    if (this.meta.get('Default:FrontendEmote_j').FrontendEmote.emoteItemDef !== 'None') await this.clearEmote();

    let data = this.meta.get('Default:FrontendEmote_j');
    data = this.meta.set('Default:FrontendEmote_j', {
      ...data,
      FrontendEmote: {
        ...data.FrontendEmote,
        emoteItemDef: `/Game/Athena/Items/Cosmetics/Dances/${eid}.${eid}`,
        emoteSection: -2,
      },
    });

    await this.sendPatch({
      'Default:FrontendEmote_j': data,
    });
  }

  /**
   * Updates the client party member's emoji
   * @param id The emoji's ID
   * @throws {EpicgamesAPIError}
   */
  public async setEmoji(id: string) {
    if (this.meta.get('Default:FrontendEmote_j').FrontendEmote.emoteItemDef !== 'None') await this.clearEmote();

    let data = this.meta.get('Default:FrontendEmote_j');
    data = this.meta.set('Default:FrontendEmote_j', {
      ...data,
      FrontendEmote: {
        ...data.FrontendEmote,
        emoteItemDef: `/Game/Athena/Items/Cosmetics/Dances/Emoji/${id}.${id}`,
        emoteSection: -2,
      },
    });
    await this.sendPatch({
      'Default:FrontendEmote_j': data,
    });
  }

  /**
   * Clears the client party member's emote and emoji
   * @throws {EpicgamesAPIError}
   */
  public async clearEmote() {
    let data = this.meta.get('Default:FrontendEmote_j');

    data = this.meta.set('Default:FrontendEmote_j', {
      ...data,
      FrontendEmote: {
        ...data.FrontendEmote,
        emoteItemDef: 'None',
        emoteSection: -1,
      },
    });

    await this.sendPatch({
      'Default:FrontendEmote_j': data,
    });
  }

  /**
   * Clears the client party member's backpack
   * @throws {EpicgamesAPIError}
   */
  public async clearBackpack() {
    let data = this.meta.get('Default:AthenaCosmeticLoadout_j');

    data = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...data,
      AthenaCosmeticLoadout: {
        ...data.AthenaCosmeticLoadout,
        backpackDef: '',
      },
    });

    await this.sendPatch({
      'Default:AthenaCosmeticLoadout_j': data,
    });
  }

  /**
   * Updates the client party member's match state.
   * NOTE: This is visually, the client will not actually join a match
   * @param isPlaying Whether the client is in a match
   * @param playerCount The match player count (must be between 0 and 255)
   * @param startedAt The start date of the match
   * @throws {EpicgamesAPIError}
   */
  public async setPlaying(isPlaying = true, playerCount = 100, startedAt = new Date()) {
    await this.sendPatch({
      'Default:Location_s': this.meta.set('Default:Location_s', isPlaying ? 'InGame' : 'PreLobby'),
      'Default:LobbyState_j': this.meta.set('Default:LobbyState_j', {
        ...this.meta.get('Default:LobbyState_j'),
        LobbyState: {
          ...this.meta.get('Default:LobbyState_j').LobbyState,
          hasPreloadedAthena: isPlaying,
        },
      }),
      'Default:SpectateAPartyMemberAvailable_b': this.meta.set('Default:SpectateAPartyMemberAvailable_b', isPlaying),
      'Default:NumAthenaPlayersLeft_U': this.meta.set('Default:NumAthenaPlayersLeft_U', playerCount),
      'Default:UtcTimeStartedMatchAthena_s': this.meta.set('Default:UtcTimeStartedMatchAthena_s', startedAt.toISOString()),
    });
  }

  /**
   * Updates the client party member's pre lobby map marker.
   * [0, 0] would be the center of the map
   * @param isSet Whether the marker is set
   * @param locationX The marker x location
   * @param locationY The marker y location
   * @throws {EpicgamesAPIError}
   */
  public async setMarker(isSet: boolean, locationX?: number, locationY?: number) {
    let data = this.meta.get('Default:FrontEndMapMarker_j');

    data = this.meta.set('Default:FrontEndMapMarker_j', {
      ...data,
      FrontEndMapMarker: {
        ...data.FrontEndMapMarker,
        bIsSet: isSet,
        markerLocation: {
          ...data.FrontEndMapMarker.markerLocation,
          x: locationY || 0,
          y: locationX || 0,
        },
      },
    });

    await this.sendPatch({
      'Default:FrontEndMapMarker_j': data,
    });
  }

  /**
   * Updates the client party member's assisted challenge info
   * @param questItemDef The quest item definition
   * @param objectivesCompleted The quest progress (number of completed objectives)
   * @throws {EpicgamesAPIError}
   */
  public async setAssistedChallenge(questItemDef?: string, objectivesCompleted?: number) {
    let data = this.meta.get('Default:AssistedChallengeInfo_j');

    data = this.meta.set('Default:AssistedChallengeInfo_j', {
      ...data,
      AssistedChallengeInfo: {
        ...data.AssistedChallengeInfo,
        questItemDef: questItemDef || 'None',
        objectivesCompleted: objectivesCompleted || 0,
      },
    });

    await this.sendPatch({
      'Default:AssistedChallengeInfo_j': data,
    });
  }

  /**
   * Updates the client party member's crowns.
   * Shown when using the EID_Coronet emote
   * @param crowns The amount of crowns / "Royal Royales"
   * @throws {EpicgamesAPIError}
   */
  public async setCrowns(crowns: number) {
    let data = this.meta.get('Default:AthenaCosmeticLoadout_j');

    data = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...data,
      AthenaCosmeticLoadout: {
        ...data.AthenaCosmeticLoadout,
        cosmeticStats: [{
          statName: 'TotalVictoryCrowns',
          statValue: 0,
        }, {
          statName: 'TotalRoyalRoyales',
          statValue: crowns,
        }, {
          statName: 'HasCrown',
          statValue: 0,
        }],
      },
    });

    await this.sendPatch({
      'Default:AthenaCosmeticLoadout_j': data,
    });
  }
}

export default ClientPartyMember;

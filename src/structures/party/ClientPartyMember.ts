import { AsyncQueue } from '@sapphire/async-queue';
import Endpoints from '../../../resources/Endpoints';
import ClientPartyMemberMeta from './ClientPartyMemberMeta';
import PartyMember from './PartyMember';
import { AuthSessionStoreKey } from '../../../resources/enums';
import EpicgamesAPIError from '../../exceptions/EpicgamesAPIError';
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

    this.update({ id: this.id, displayName: this.client.user.self!.displayName, externalAuths: this.client.user.self!.externalAuths });

    if (this.client.lastPartyMemberMeta) this.meta.update(this.client.lastPartyMemberMeta, true);
  }

  /**
   * Sends a meta patch to Epicgames's servers
   * @param updated The updated schema
   * @throws {EpicgamesAPIError}
   */
  public async sendPatch(updated: PartyMemberSchema): Promise<void> {
    await this.patchQueue.wait();

    try {
      await this.client.http.epicgamesRequest({
        method: 'PATCH',
        url: `${Endpoints.BR_PARTY}/parties/${this.party.id}/members/${this.id}/meta`,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          delete: [],
          revision: this.revision,
          update: updated,
        },
      }, AuthSessionStoreKey.Fortnite);
    } catch (e) {
      if (e instanceof EpicgamesAPIError && e.code === 'errors.com.epicgames.social.party.stale_revision') {
        this.revision = parseInt(e.messageVars[1], 10);
        this.patchQueue.shift();
        return this.sendPatch(updated);
      }

      this.patchQueue.shift();

      throw e;
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
        readyInputType: ready ? 'MouseAndKeyboard' : 'Count',
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
        readyInputType: 'Count',
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
   * @param id The outfit's ID
   * @param variants The outfit's variants
   * @param enlightment The outfit's enlightment
   * @param path The outfit's path in the game files
   * @throws {EpicgamesAPIError}
   */
  public async setOutfit(id: string, variants: CosmeticVariant[] = [], enlightment?: CosmeticEnlightment, path?: string) {
    let data = this.meta.get('Default:AthenaCosmeticLoadout_j');
    let variantData = this.meta.get('Default:AthenaCosmeticLoadoutVariants_j');

    const patches: Schema = {};

    const parsedVariants: CosmeticsVariantMeta = {
      athenaCharacter: {
        i: variants.map((v) => ({
          c: v.channel,
          v: v.variant,
          dE: v.dE || 0,
        })),
      },
    };

    const scratchpad = [];
    if (enlightment?.length === 2) {
      scratchpad.push({
        t: enlightment[0],
        v: enlightment[1],
      });
    }

    data = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...data,
      AthenaCosmeticLoadout: {
        ...data.AthenaCosmeticLoadout,
        characterDef: `${path?.replace(/\/$/, '') ?? '/BRCosmetics/Athena/Items/Cosmetics/Characters'}/${id}.${id}`,
        scratchpad,
      },
    });

    patches['Default:AthenaCosmeticLoadout_j'] = data;

    delete variantData.AthenaCosmeticLoadoutVariants.vL.AthenaCharacter;
    if (parsedVariants.athenaCharacter?.i[0]) {
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
   * @param id The backpack's ID
   * @param variants The backpack's variants
   * @param path The backpack's path in the game files
   * @throws {EpicgamesAPIError}
   */
  public async setBackpack(id: string, variants: CosmeticVariant[] = [], path?: string) {
    let data = this.meta.get('Default:AthenaCosmeticLoadout_j');
    let variantData = this.meta.get('Default:AthenaCosmeticLoadoutVariants_j');

    const patches: Schema = {};

    const parsedVariants: CosmeticsVariantMeta = {
      athenaBackpack: {
        i: variants.map((v) => ({
          c: v.channel,
          v: v.variant,
          dE: v.dE || 0,
        })),
      },
    };

    data = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...data,
      AthenaCosmeticLoadout: {
        ...data.AthenaCosmeticLoadout,
        backpackDef: `${path?.replace(/\/$/, '') ?? '/BRCosmetics/Athena/Items/Cosmetics/Backpacks'}/${id}.${id}`,
      },
    });

    patches['Default:AthenaCosmeticLoadout_j'] = data;

    delete variantData.AthenaCosmeticLoadoutVariants.vL.AthenaBackpack;
    if (parsedVariants.athenaBackpack?.i[0]) {
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
   * @param path The pet's path in the game files
   */
  public async setPet(id: string, variants: CosmeticVariant[] = [], path?: string) {
    return this.setBackpack(id, variants, path ?? '/BRCosmetics/Athena/Items/Cosmetics/PetCarriers');
  }

  /**
   * Updates the client party member's pickaxe
   * @param id The pickaxe's ID
   * @param variants The pickaxe's variants
   * @param path The pickaxe's path in the game files
   * @throws {EpicgamesAPIError}
   */
  public async setPickaxe(id: string, variants: CosmeticVariant[] = [], path?: string) {
    let data = this.meta.get('Default:AthenaCosmeticLoadout_j');
    let variantData = this.meta.get('Default:AthenaCosmeticLoadoutVariants_j');

    const patches: Schema = {};

    const parsedVariants: CosmeticsVariantMeta = {
      athenaPickaxe: {
        i: variants.map((v) => ({
          c: v.channel,
          v: v.variant,
          dE: v.dE || 0,
        })),
      },
    };

    data = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...data,
      AthenaCosmeticLoadout: {
        ...data.AthenaCosmeticLoadout,
        pickaxeDef: `${path?.replace(/\/$/, '') ?? '/BRCosmetics/Athena/Items/Cosmetics/Pickaxes'}/${id}.${id}`,
      },
    });

    patches['Default:AthenaCosmeticLoadout_j'] = data;

    delete variantData.AthenaCosmeticLoadoutVariants.vL.AthenaPickaxe;
    if (parsedVariants.athenaPickaxe?.i[0]) {
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
   * @param id The emote's ID
   * @param path The emote's path in the game files
   * @throws {EpicgamesAPIError}
   */
  public async setEmote(id: string, path?: string) {
    if (this.meta.get('Default:FrontendEmote_j').FrontendEmote.emoteItemDef !== 'None') await this.clearEmote();

    let data = this.meta.get('Default:FrontendEmote_j');
    data = this.meta.set('Default:FrontendEmote_j', {
      ...data,
      FrontendEmote: {
        ...data.FrontendEmote,
        emoteItemDef: `${path?.replace(/\/$/, '') ?? '/BRCosmetics/Athena/Items/Cosmetics/Dances'}/${id}.${id}`,
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
   * @param path The emoji's path in the game files
   * @throws {EpicgamesAPIError}
   */
  public async setEmoji(id: string, path?: string) {
    return this.setEmote(id, path ?? '/BRCosmetics/Athena/Items/Cosmetics/Dances/Emoji');
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
      'Default:DownloadOnDemandProgress_d': this.meta.set('Default:DownloadOnDemandProgress_d', isPlaying ? '1.000000' : '0.000000'),
      'Default:PackedState_j': this.meta.set('Default:PackedState_j', {
        ...this.meta.get('Default:PackedState_j'),
        PackedState: {
          ...this.meta.get('Default:PackedState_j').PackedState,
          location: isPlaying ? 'InGame' : 'PreLobby',
          gameMode: isPlaying ? 'InBattleRoyale' : 'None',
        },
      }),
      'Default:LobbyState_j': this.meta.set('Default:LobbyState_j', {
        ...this.meta.get('Default:LobbyState_j'),
        LobbyState: {
          ...this.meta.get('Default:LobbyState_j').LobbyState,
          hasPreloadedAthena: isPlaying,
        },
      }),
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
   * Updates the client party member's cosmetic stats.
   * Crowns are shown when using the EID_Coronet emote
   * @param crowns The amount of crowns / "Royal Royales"
   * @param rankedProgression The ranked progression
   * @throws {EpicgamesAPIError}
   */
  public async setCosmeticStats(crowns: number, rankedProgression: number) {
    let data = this.meta.get('Default:AthenaCosmeticLoadout_j');

    data = this.meta.set('Default:AthenaCosmeticLoadout_j', {
      ...data,
      AthenaCosmeticLoadout: {
        ...data.AthenaCosmeticLoadout,
        cosmeticStats: [{
          statName: 'HabaneroProgression',
          statValue: rankedProgression,
        }, {
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

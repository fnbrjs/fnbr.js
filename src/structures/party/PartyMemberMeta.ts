import Meta from '../../util/Meta';
import type {
  BannerMeta, BattlePassMeta, CosmeticsVariantMeta, PartyMemberIsland, MatchMeta, PartyMemberSchema, Platform,
} from '../../../resources/structs';

/**
 * Represents a party member meta
 */
class PartyMemberMeta extends Meta<PartyMemberSchema> {
  /**
   * Internal helper to get the primary loadout slots object
   */
  private get loadoutSlots() {
    return this.get('Default:MpLoadout1_j')?.MpLoadout1?.s || {};
  }

  /**
   * The currently equipped outfit CID
   */
  public get outfit(): string | undefined {
    return this.loadoutSlots?.ac?.i;
  }

  /**
   * The currently equipped pickaxe ID
   */
  public get pickaxe(): string | undefined {
    return this.loadoutSlots?.ap?.i;
  }

  /**
   * The current emote EID
   */
  public get emote(): string | undefined {
    const emoteAsset: string = this.get('Default:FrontendEmote_j')?.FrontendEmote?.pickable;
    if (emoteAsset === 'None' || !emoteAsset) return undefined;
    return emoteAsset.match(/(?<=\w*\.)\w*/)?.shift();
  }

  /**
   * The currently equipped backpack BID
   */
  public get backpack(): string | undefined {
    return this.loadoutSlots?.ab?.i;
  }

  /**
   * The currently equipped shoes
   */
  public get shoes(): string | undefined {
    return this.loadoutSlots?.as?.i;
  }

  /**
   * Whether the member is ready
   */
  public get isReady() {
    return this.get('Default:LobbyState_j')?.LobbyState?.inGameReadyCheckStatus === 'Ready';
  }

  /**
   * Whether the member is sitting out
   */
  public get isSittingOut() {
    return this.get('Default:LobbyState_j')?.LobbyState?.inGameReadyCheckStatus === 'SittingOut';
  }

  /**
   * The current input method
   */
  public get input(): string | undefined {
    return this.get('Default:LobbyState_j')?.LobbyState?.currentInputType;
  }

  /**
   * The cosmetic variants
   */
  public get variants(): CosmeticsVariantMeta {
    const slots = this.loadoutSlots;

    return {
      athenaCharacter: slots.ac?.v ? { i: slots.ac.v.map((v: string | number) => `${v}`) } : undefined,
      athenaBackpack: slots.ab?.v ? { i: slots.ab.v.map((v: string | number) => `${v}`) } : undefined,
      athenaPickaxe: slots.ap?.v ? { i: slots.ap.v.map((v: string | number) => `${v}`) } : undefined,
    };
  }

  /**
   * The banner info
   */
  public get banner(): BannerMeta | undefined {
    const slots = this.loadoutSlots;
    if (!slots.li?.i && !slots.lc?.i) return undefined;

    return {
      bannerIconId: slots.li?.i,
      bannerColorId: slots.lc?.i,
    };
  }

  /**
   * The battle pass info
   */
  public get battlepass(): BattlePassMeta | undefined {
    const info = this.get('Default:BattlePassInfo_j')?.BattlePassInfo;
    if (!info) return undefined;

    return {
      bHasPurchasedPass: !!info.bHasPurchasedPass,
      passLevel: info.passLevel || 0,
      selfBoostXp: info.selfBoostXp || 0,
      friendBoostXp: info.friendBoostXp || 0,
    };
  }

  /**
   * The platform
   */
  public get platform(): Platform | undefined {
    return this.get('Default:PlatformData_j')?.PlatformData?.platform?.platformDescription?.name;
  }

  /**
   * The match info
   */
  public get match(): MatchMeta {
    const location = this.get('Default:PackedState_j')?.PackedState?.location;
    const hasPreloadedAthena = this.get('Default:LobbyState_j')?.LobbyState?.hasPreloadedAthena;
    const playerCount = this.get('Default:NumAthenaPlayersLeft_U');
    const matchStartedAt = this.get('Default:UtcTimeStartedMatchAthena_s');

    return {
      hasPreloadedAthena,
      location,
      matchStartedAt: matchStartedAt && new Date(matchStartedAt),
      playerCount,
    };
  }

  /**
   * The current island info
   */
  public get island(): PartyMemberIsland {
    const island = this.get('Default:MatchmakingInfo_j')?.MatchmakingInfo?.currentIsland?.island;
    if (typeof island === 'string') return JSON.parse(island);
    return island;
  }

  /**
   * Whether a marker has been set
   */
  public get isMarkerSet(): boolean {
    return !!this.get('Default:FrontEndMapMarker_j')?.FrontEndMapMarker?.bIsSet;
  }

  /**
   * The marker location [x, y] tuple. [0, 0] if there is no marker set
   */
  public get markerLocation(): [number, number] {
    const marker = this.get('Default:FrontEndMapMarker_j')?.FrontEndMapMarker?.markerLocation;
    if (!marker) return [0, 0];

    return [marker.y, marker.x];
  }

  /**
   * Whether the member owns Save The World
   */
  public get hasPurchasedSTW() {
    return !!this.get('Default:PackedState_j')?.PackedState?.hasPurchasedSTW;
  }
}

export default PartyMemberMeta;

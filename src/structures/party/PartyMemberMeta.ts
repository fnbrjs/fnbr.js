import Meta from '../../util/Meta';
import type {
  BannerMeta, BattlePassMeta, CosmeticsVariantMeta, MatchMeta, PartyMemberSchema, Platform,
} from '../../../resources/structs';

/**
 * Represents a party member meta
 */
class PartyMemberMeta extends Meta<PartyMemberSchema> {
  /**
   * The currently equipped outfit CID
   */
  public get outfit(): string | undefined {
    return (this.get('Default:AthenaCosmeticLoadout_j')?.AthenaCosmeticLoadout?.characterDef as string)?.match(/(?<=\w*\.)\w*/)?.shift();
  }

  /**
   * The currently equipped pickaxe ID
   */
  public get pickaxe(): string | undefined {
    return (this.get('Default:AthenaCosmeticLoadout_j')?.AthenaCosmeticLoadout?.pickaxeDef as string)?.match(/(?<=\w*\.)\w*/)?.shift();
  }

  /**
   * The current emote EID
   */
  public get emote(): string | undefined {
    const emoteAsset: string = this.get('Default:FrontendEmote_j')?.FrontendEmote?.emoteItemDef;
    if (emoteAsset === 'None' || !emoteAsset) return undefined;
    return emoteAsset.match(/(?<=\w*\.)\w*/)?.shift();
  }

  /**
   * The currently equipped backpack BID
   */
  public get backpack(): string | undefined {
    return (this.get('Default:AthenaCosmeticLoadout_j')?.AthenaCosmeticLoadout?.backpackDef as string)?.match(/(?<=\w*\.)\w*/)?.shift();
  }

  /**
   * Whether the member is ready
   */
  public get isReady() {
    return this.get('Default:LobbyState_j')?.LobbyState?.gameReadiness === 'Ready';
  }

  /**
   * Whether the member is sitting out
   */
  public get isSittingOut() {
    return this.get('Default:LobbyState_j')?.LobbyState?.gameReadiness === 'SittingOut';
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
    const variants = this.get('Default:AthenaCosmeticLoadoutVariants_j')?.AthenaCosmeticLoadoutVariants?.vL;
    if (!variants) return {};

    const pascalCaseVariants: any = {};
    Object.keys(variants).forEach((k) => {
      pascalCaseVariants[`${k.charAt(0).toUpperCase()}${k.slice(1)}`] = variants[k];
    });

    return pascalCaseVariants;
  }

  /**
   * The custom data store
   */
  public get customDataStore(): string[] {
    return this.get('Default:ArbitraryCustomDataStore_j')?.ArbitraryCustomDataStore || [];
  }

  /**
   * The banner info
   */
  public get banner(): BannerMeta | undefined {
    return this.get('Default:AthenaBannerInfo_j')?.AthenaBannerInfo;
  }

  /**
   * The battle pass info
   */
  public get battlepass(): BattlePassMeta | undefined {
    return this.get('Default:BattlePassInfo_j')?.BattlePassInfo;
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
    return !!this.get('Default:PackedState_j').PackedState?.hasPurchasedSTW;
  }
}

export default PartyMemberMeta;

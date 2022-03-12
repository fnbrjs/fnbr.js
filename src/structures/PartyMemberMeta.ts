import {
  AssistedChallengeMeta,
  BannerMeta, BattlePassMeta, CosmeticsVariantMeta, MatchMeta, Platform, Schema,
} from '../../resources/structs';
import Meta from '../util/Meta';
import PartyMember from './PartyMember';

/**
 * Represents a party member meta
 */
class PartyMemberMeta extends Meta {
  /**
   * The party member
   */
  public member: PartyMember;

  /**
   * @param member The party member
   * @param schema The schema
   */
  constructor(member: PartyMember, schema: Schema) {
    super(schema);

    this.member = member;
  }

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
    const location = this.get('Default:Location_s');
    const hasPreloadedAthena = this.get('Default:HasPreloadedAthena_b');
    const isSpectatable = this.get('Default:SpectateAPartyMemberAvailable_b');
    const playerCount = this.get('Default:NumAthenaPlayersLeft_U');
    const matchStartedAt = this.get('Default:UtcTimeStartedMatchAthena_s');

    return {
      hasPreloadedAthena,
      isSpectatable,
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
   * The assisted challenge
   */
  public get assistedChallenge(): AssistedChallengeMeta | undefined {
    const challenge = this.get('Default:AssistedChallengeInfo_j')?.AssistedChallengeInfo;
    if (!challenge) return undefined;

    return {
      questItemDef: challenge.questItemDef,
      objectivesCompleted: challenge.objectivesCompleted,
    };
  }

  /**
   * Whether the member owns Save The World
   */
  public get hasPurchasedSTW() {
    return !!this.get('Default:HasPurchasedSTW_b');
  }
}

export default PartyMemberMeta;

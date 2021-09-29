import { Schema } from '../../resources/structs';
import { getRandomDefaultCharacter } from '../util/Util';
import PartyMember from './PartyMember';
import PartyMemberMeta from './PartyMemberMeta';

/**
 * Represents the client's party member meta
 */
class ClientPartyMemberMeta extends PartyMemberMeta {
  /**
   * The party member
   */
  public member: PartyMember;

  /**
   * @param member The party member
   * @param schema The schema
   */
  constructor(member: PartyMember, schema: Schema) {
    const defaultCharacter = getRandomDefaultCharacter();

    super(member, {
      'Default:CrossplayPreference_s': 'OptedIn',
      'Default:Location_s': 'PreLobby',
      'Default:CampaignHero_j': JSON.stringify({
        CampaignHero: {
          heroItemInstanceId: '',
          heroType: `FortHeroType'/Game/Athena/Heroes/${defaultCharacter}.${defaultCharacter}'`,
        },
      }),
      'Default:CampaignInfo_j': JSON.stringify({
        CampaignInfo: {
          matchmakingLevel: 0,
          zoneInstanceId: '',
          homeBaseVersion: 1,
        },
      }),
      'Default:FrontendEmote_j': JSON.stringify({
        FrontendEmote: {
          emoteItemDef: 'None',
          emoteEKey: '',
          emoteSection: -1,
        },
      }),
      'Default:NumAthenaPlayersLeft_U': '0',
      'Default:SpectateAPartyMemberAvailable_b': false,
      'Default:UtcTimeStartedMatchAthena_s': '0001-01-01T00:00:00.000Z',
      'Default:LobbyState_j': JSON.stringify({
        LobbyState: {
          inGameReadyCheckStatus: 'None',
          gameReadiness: 'NotReady',
          readyInputType: 'Count',
          currentInputType: 'MouseAndKeyboard',
          hiddenMatchmakingDelayMax: 0,
          hasPreloadedAthena: true,
        },
      }),
      'Default:AssistedChallengeInfo_j': JSON.stringify({
        AssistedChallengeInfo: {
          questItemDef: 'None',
          objectivesCompleted: 0,
        },
      }),
      'Default:FeatDefinition_s': 'None',
      'Default:MemberSquadAssignmentRequest_j': JSON.stringify({
        MemberSquadAssignmentRequest: {
          startingAbsoluteIdx: -1,
          targetAbsoluteIdx: -1,
          swapTargetMemberId: 'INVALID',
          version: 0,
        },
      }),
      'Default:VoiceChatStatus_s': 'Enabled',
      'Default:SidekickStatus_s': 'None',
      'Default:FrontEndMapMarker_j': JSON.stringify({
        FrontEndMapMarker: {
          markerLocation: {
            x: 0,
            y: 0,
          },
          bIsSet: false,
        },
      }),
      'Default:AthenaCosmeticLoadout_j': JSON.stringify({
        AthenaCosmeticLoadout: {
          characterDef: `AthenaCharacterItemDefinition'/Game/Athena/Items/Cosmetics/Characters/${defaultCharacter}.${defaultCharacter}'`,
          characterEKey: '',
          backpackDef: 'None',
          backpackEKey: '',
          pickaxeDef: 'AthenaPickaxeItemDefinition\'/Game/Athena/Items/Cosmetics/Pickaxes/DefaultPickaxe.DefaultPickaxe\'',
          pickaxeEKey: '',
          contrailDef: 'None',
          contrailEKey: '',
          scratchpad: [],
        },
      }),
      'Default:AthenaCosmeticLoadoutVariants_j': JSON.stringify({
        AthenaCosmeticLoadoutVariants: {
          vL: {},
        },
      }),
      'Default:ArbitraryCustomDataStore_j': JSON.stringify({
        ArbitraryCustomDataStore: [],
      }),
      'Default:AthenaBannerInfo_j': JSON.stringify({
        AthenaBannerInfo: {
          bannerIconId: 'standardbanner15',
          bannerColorId: 'defaultcolor15',
          seasonLevel: 1,
        },
      }),
      'Default:BattlePassInfo_j': JSON.stringify({
        BattlePassInfo: {
          bHasPurchasedPass: false,
          passLevel: 1,
          selfBoostXp: 0,
          friendBoostXp: 0,
        },
      }),
      'Default:PlatformData_j': JSON.stringify({
        PlatformData: {
          platform: {
            platformDescription: {
              name: member.client.config.platform,
              platformType: 'DESKTOP',
              onlineSubsystem: 'None',
              sessionType: '',
              externalAccountType: '',
              crossplayPool: 'DESKTOP',
            },
          },
          uniqueId: 'INVALID',
          sessionId: '',
        },
      }),
    });

    if (schema) this.update(schema, true);
  }
}

export default ClientPartyMemberMeta;

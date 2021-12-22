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
  public member!: PartyMember;

  /**
   * @param member The party member
   * @param schema The schema
   */
  constructor(member: PartyMember, schema: Schema) {
    const defaultCharacter = getRandomDefaultCharacter();

    super(member, {
      'Default:ArbitraryCustomDataStore_j': JSON.stringify({
        ArbitraryCustomDataStore: [],
      }),
      'Default:AssistedChallengeInfo_j': JSON.stringify({
        AssistedChallengeInfo: {
          questItemDef: 'None',
          objectivesCompleted: 0,
        },
      }),
      'Default:AthenaBannerInfo_j': JSON.stringify({
        AthenaBannerInfo: {
          bannerIconId: 'standardbanner15',
          bannerColorId: 'defaultcolor15',
          seasonLevel: 1,
        },
      }),
      'Default:AthenaCosmeticLoadoutVariants_j': JSON.stringify({
        AthenaCosmeticLoadoutVariants: {
          vL: {},
          fT: false,
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
          cosmeticStats: [{
            statName: 'TotalVictoryCrowns',
            statValue: 0,
          }, {
            statName: 'TotalRoyalRoyales',
            statValue: 0,
          }],
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
      'Default:CampaignHero_j': JSON.stringify({
        CampaignHero: {
          heroItemInstanceId: '',
          heroType: `/Game/Athena/Heroes/${defaultCharacter.replace('CID', 'HID')}.${defaultCharacter.replace('CID', 'HID')}`,
        },
      }),
      'Default:CampaignInfo_j': JSON.stringify({
        CampaignInfo: {
          matchmakingLevel: 0,
          zoneInstanceId: '',
          homeBaseVersion: 1,
        },
      }),
      'Default:CrossplayPreference_s': 'OptedIn',
      'Default:FeatDefinition_s': 'None',
      'Default:FrontEndMapMarker_j': JSON.stringify({
        FrontEndMapMarker: {
          markerLocation: {
            x: 0,
            y: 0,
          },
          bIsSet: false,
        },
      }),
      'Default:FrontendEmote_j': JSON.stringify({
        FrontendEmote: {
          emoteItemDef: 'None',
          emoteEKey: '',
          emoteSection: -1,
        },
      }),
      'Default:HasCompletedSTWTutorial_b': false,
      'Default:HasPurchasedSTW_b': false,
      'Default:LobbyState_j': JSON.stringify({
        LobbyState: {
          inGameReadyCheckStatus: 'None',
          gameReadiness: 'NotReady',
          readyInputType: 'Count',
          currentInputType: 'MouseAndKeyboard',
          hiddenMatchmakingDelayMax: 0,
          hasPreloadedAthena: false,
        },
      }),
      'Default:Location_s': 'PreLobby',
      'Default:MemberSquadAssignmentRequest_j': JSON.stringify({
        MemberSquadAssignmentRequest: {
          startingAbsoluteIdx: -1,
          targetAbsoluteIdx: -1,
          swapTargetMemberId: 'INVALID',
          version: 0,
        },
      }),
      'Default:NumAthenaPlayersLeft_U': '0',
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
      'Default:PlatformSupportsSTW_b': true,
      'Default:SharedQuests_j': JSON.stringify({
        SharedQuests: {
          bcktMap: {
            BR: {
              qsts: [],
            },
          },
          pndQst: '',
        },
      }),
      'Default:SidekickStatus_s': 'None',
      'Default:SpectateAPartyMemberAvailable_b': false,
      'Default:SubGame_s': 'Athena',
      'Default:UtcTimeStartedMatchAthena_s': '0001-01-01T00:00:00.000Z',
      'Default:VoiceChatStatus_s': 'PartyVoice',
      'internal:voicechatmuted_b': false,
    });

    if (schema) this.update(schema, true);
  }
}

export default ClientPartyMemberMeta;

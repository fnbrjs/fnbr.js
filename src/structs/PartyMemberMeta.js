const Meta = require('../util/Meta');

/**
 * Represents a party member's meta
 * @extends {Meta}
 * @private
 */
class PartyMemberMeta extends Meta {
  /**
   * @param {Object} member The party member
   * @param {Object} meta The meta
   */
  constructor(member, meta) {
    super();

    Object.defineProperty(this, 'Member', { value: member });

    const defaultCharacters = [
      'CID_556_Athena_Commando_F_RebirthDefaultA',
      'CID_557_Athena_Commando_F_RebirthDefaultB',
      'CID_558_Athena_Commando_F_RebirthDefaultC',
      'CID_559_Athena_Commando_F_RebirthDefaultD',
      'CID_560_Athena_Commando_M_RebirthDefaultA',
      'CID_561_Athena_Commando_M_RebirthDefaultB',
      'CID_562_Athena_Commando_M_RebirthDefaultC',
      'CID_563_Athena_Commando_M_RebirthDefaultD',
    ];
    const defCharacter = defaultCharacters[Math.floor(Math.random() * defaultCharacters.length)];

    /**
     * The meta's schema
     * @type {Object}
     */
    this.schema = {
      'Default:Location_s': 'PreLobby',
      'Default:CampaignHero_j': JSON.stringify({
        CampaignHero: {
          heroItemInstanceId: '',
          heroType: `FortHeroType'/Game/Athena/Heroes/${defCharacter}.${defCharacter}'`,
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
          characterDef: `AthenaCharacterItemDefinition'/Game/Athena/Items/Cosmetics/Characters/${defCharacter}.${defCharacter}'`,
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
              name: this.Member.client.config.platform,
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
      'Default:CrossplayPreference_s': 'OptedIn',
    };

    if (meta) this.update(meta, true);
  }
}

module.exports = PartyMemberMeta;

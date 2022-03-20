import defaultPartyMemberMeta from '../../resources/defaultPartyMemberMeta.json';
import { PartyMemberSchema } from '../../resources/structs';
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
  constructor(member: PartyMember, schema: PartyMemberSchema) {
    super({ ...defaultPartyMemberMeta });

    this.member = member;

    const defaultCharacter = getRandomDefaultCharacter();

    this.update({
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
      'Default:CampaignHero_j': JSON.stringify({
        CampaignHero: {
          heroItemInstanceId: '',
          heroType: `/Game/Athena/Heroes/${defaultCharacter.replace('CID', 'HID')}.${defaultCharacter.replace('CID', 'HID')}`,
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
    }, true);

    if (schema) this.update(schema, true);
  }
}

export default ClientPartyMemberMeta;

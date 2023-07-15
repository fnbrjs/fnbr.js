import defaultPartyMemberMeta from '../../../resources/defaultPartyMemberMeta.json';
import { getRandomDefaultCharacter } from '../../util/Util';
import PartyMemberMeta from './PartyMemberMeta';
import type { PartyMemberSchema } from '../../../resources/structs';
import type PartyMember from './PartyMember';

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
          ...JSON.parse(defaultPartyMemberMeta['Default:AthenaCosmeticLoadout_j']).AthenaCosmeticLoadout,
          characterDef: `AthenaCharacterItemDefinition'/BRCosmetics/Athena/Items/Cosmetics/Characters/${defaultCharacter}.${defaultCharacter}'`,
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

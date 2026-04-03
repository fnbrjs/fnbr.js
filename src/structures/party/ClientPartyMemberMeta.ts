import defaultPartyMemberMeta from '../../../resources/defaultPartyMemberMeta';
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

    const mpLoadoutData = this.get('Default:MpLoadout1_j')?.MpLoadout1;

    this.update({
      'Default:MpLoadout1_j': JSON.stringify({
        MpLoadout1: {
          ...mpLoadoutData,
          s: {
            ...mpLoadoutData?.s,
            ac: {
              ...(mpLoadoutData?.s?.ac || {}),
              i: defaultCharacter,
            },
          },
        },
      }),
      'Default:CampaignHero_j': JSON.stringify({
        CampaignHero: {
          heroItemInstanceId: '',
          heroType: 'None',
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

import STWItem from './STWItem';
import type { STWProfileHeroLoadoutData } from '../../../resources/httpResponses';
import type Client from '../../Client';

/**
 * Represents a Save The World profile's hero loadout
 */
class STWHeroLoadout extends STWItem {
  /**
   * The loadout's index
   */
  public loadoutIndex: number;

  /**
   * The loadout's team perk ID
   */
  public teamPerk?: string;

  /**
   * The loadout's main hero (commander) ID
   */
  public commanderSlot: string;

  /**
   * The loadout's support hero IDs
   */
  public supportSquad: [
    string | undefined,
    string | undefined,
    string | undefined,
    string | undefined,
    string | undefined,
  ];

  /**
   * The loadout's gadget IDs
   */
  public gadgets: [
    string | undefined,
    string | undefined,
  ];

  /**
   * @param client The main client
   * @param id The item ID
   * @param data The loadout data
   */
  constructor(client: Client, id: string, data: STWProfileHeroLoadoutData) {
    super(client, id, data);

    this.loadoutIndex = data.attributes.loadout_index;

    this.teamPerk = data.attributes.team_perk !== '' ? data.attributes.team_perk : undefined;

    this.commanderSlot = data.attributes.crew_members.commanderslot;

    this.supportSquad = [
      data.attributes.crew_members.followerslot1 || undefined,
      data.attributes.crew_members.followerslot2 || undefined,
      data.attributes.crew_members.followerslot3 || undefined,
      data.attributes.crew_members.followerslot4 || undefined,
      data.attributes.crew_members.followerslot5 || undefined,
    ];

    this.gadgets = [
      data.attributes.gadgets?.find((g) => g.slot_index === 0)?.gadget,
      data.attributes.gadgets?.find((g) => g.slot_index === 1)?.gadget,
    ];
  }
}

export default STWHeroLoadout;

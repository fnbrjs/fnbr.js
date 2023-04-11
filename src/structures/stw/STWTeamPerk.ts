import STWItem from './STWItem';
import type { STWProfileItemData } from '../../../resources/httpResponses';
import type Client from '../../Client';

/**
 * Represents a Save The World profile's team perk
 */
class STWTeamPerk extends STWItem {
  /**
   * The team perk's ID
   */
  public teamPerkId: string;

  /**
   * @param client The main client
   * @param id The item ID
   * @param data The team perk data
   */
  constructor(client: Client, id: string, data: STWProfileItemData) {
    super(client, id, data);

    [, this.teamPerkId] = data.templateId.split(':');
  }
}

export default STWTeamPerk;

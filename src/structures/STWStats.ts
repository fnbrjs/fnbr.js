import Client from '../client/Client';
import Base from '../client/Base';
import { STWProfileStatsData } from '../../resources/httpResponses';

/**
 * Represents a Save The World profile's item
 */
class STWStats extends Base {
  /**
   * @param client The main client
   * @param data The stats data
   */
  constructor(client: Client, data: STWProfileStatsData) {
    super(client);

    // wip
  }
}

export default STWStats;

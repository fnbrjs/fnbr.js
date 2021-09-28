import Base from '../client/Base';
import Client from '../client/Client';

/**
 * Represents a battle royale ingame radio station
 */
class RadioStation extends Base {
  /**
   * The radio station stream id
   */
  public resourceId: string;

  /**
   * The radio station icon
   */
  public image: string;

  /**
   * The radio station name
   */
  public name: string;

  /**
   * @param client The main client
   * @param data The radio station data
   */
  constructor(client: Client, data: any) {
    super(client);

    this.resourceId = data.resourceID;
    this.image = data.stationImage;
    this.name = data.title;
  }

  public async downloadStream() {
    return this.client.downloadBlurlStream(this.resourceId);
  }
}

export default RadioStation;

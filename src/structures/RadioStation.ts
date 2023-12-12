import Base from '../Base';
import Image from './Image';
import type Client from '../Client';

/**
 * Represents a battle royale ingame radio station
 */
class RadioStation extends Base {
  /**
   * The radio station's stream id
   */
  public resourceId: string;

  /**
   * The radio station's icon
   */
  public image: Image;

  /**
   * The radio station's name
   */
  public name: string;

  /**
   * @param client The main client
   * @param data The radio station's data
   */
  constructor(client: Client, data: any) {
    super(client);

    this.resourceId = data.resourceID;
    this.name = data.title;

    this.image = new Image(this.client, {
      url: data.stationImage,
      width: 265,
      height: 265,
    });
  }

  /**
   * Downloads the radio station's stream
   * @throws {AxiosError}
   */
  public async downloadStream() {
    return this.client.downloadBlurlStream(this.resourceId);
  }
}

export default RadioStation;

import Base from '../../Base';
import type Client from '../../Client';

/**
 * Represents a fortnite STW news message video
 */
class STWNewsMessageVideo extends Base {
  /**
   * The video's id
   */
  public id: string;

  /**
   * Whether the video should autoplay
   */
  public autoplay: boolean;

  /**
   * The video's string
   */
  public videoString: string;

  /**
   * Whether the video has streaming enabled
   */
  public streamingEnabled: boolean;

  /**
   * @param client The main client
   * @param data The STW news message video data
   */
  constructor(client: Client, data: any) {
    super(client);

    this.id = data.UID;
    this.autoplay = data.Autoplay;
    this.videoString = data.VideoString;
    this.streamingEnabled = data.StreamingEnabled;
  }

  /**
   * Downloads the video
   * @throws {AxiosError}
   */
  public async download() {
    return this.client.downloadBlurlStream(this.id);
  }
}

export default STWNewsMessageVideo;

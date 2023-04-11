import Base from '../Base';
import type Client from '../Client';
import type { NewsMessageVideoData } from '../../resources/structs';

/**
 * Represents a fortnite news message video
 */
class NewsMessageVideo extends Base {
  /**
   * The video's id
   */
  public id: string;

  /**
   * Whether the video should autoplay
   */
  public autoplay: boolean;

  /**
   * Whether the video should be fullscreen
   */
  public fullscreen: boolean;

  /**
   * Whether the video should loop
   */
  public loop: boolean;

  /**
   * Whether the video is muted
   */
  public mute: boolean;

  /**
   * Whether the video has streaming enabled
   */
  public streamingEnabled: boolean;

  /**
   * The video's string
   */
  public videoString: string;

  /**
   * @param client The main client
   * @param data The news message video data
   */
  constructor(client: Client, data: NewsMessageVideoData) {
    super(client);

    this.id = data.videoUID;
    this.autoplay = data.videoAutoplay;
    this.fullscreen = data.videoFullscreen;
    this.loop = data.videoLoop;
    this.mute = data.videoMute;
    this.streamingEnabled = data.videoStreamingEnabled;
    this.videoString = data.videoVideoString;
  }

  /**
   * Downloads the video
   * @throws {AxiosError}
   */
  public async download() {
    return this.client.downloadBlurlStream(this.id);
  }
}

export default NewsMessageVideo;

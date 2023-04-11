import Base from '../Base';
import Image from './Image';
import NewsMessageVideo from './NewsMessageVideo';
import type Client from '../Client';
import type { NewsMessageOffer, NewsMessagePlaylist } from '../../resources/structs';

/**
 * Represents a fortnite news message
 */
class NewsMessage extends Base {
  /**
   * The news message's title
   */
  public title: string;

  /**
   * The news message's body
   */
  public body: string;

  /**
   * The news message's images
   */
  public images: Image[];

  /**
   * The news message's entry type
   */
  public entryType: string;

  /**
   * The news message's button text override
   */
  public buttonTextOverride: string;

  /**
   * The news message's tab title override
   */
  public tabTitleOverride: string;

  /**
   * The news message's tile image
   */
  public tileImage: Image;

  /**
   * The news message's playlist
   */
  public playlist?: NewsMessagePlaylist;

  /**
   * The news message's offer
   */
  public offer?: NewsMessageOffer;

  /**
   * The news message's video
   */
  public video?: NewsMessageVideo;

  /**
   * @param client The main client
   * @param data The news message data
   */
  constructor(client: Client, data: any) {
    super(client);
    const newsData = data.contentFields;

    this.title = newsData.title;
    this.body = newsData.body;
    this.images = newsData.image.map((i: any) => new Image(this.client, i));
    this.entryType = newsData.entryType;
    this.buttonTextOverride = newsData.buttonTextOverride;
    this.tabTitleOverride = newsData.tabTitleOverride;
    this.tileImage = new Image(this.client, newsData.tileImage?.[0]);

    this.playlist = newsData.playlistId ? {
      id: newsData.playlistId,
    } : undefined;

    this.offer = newsData.offerId ? {
      id: newsData.offerId,
      action: newsData.offerAction,
    } : undefined;

    this.video = newsData.videoUID ? new NewsMessageVideo(this.client, {
      videoAutoplay: newsData.videoAutoplay,
      videoFullscreen: newsData.videoFullscreen,
      videoLoop: newsData.videoLoop,
      videoMute: newsData.videoMute,
      videoStreamingEnabled: newsData.videoStreamingEnabled,
      videoUID: newsData.videoUID,
      videoVideoString: newsData.videoVideoString,
    }) : undefined;
  }
}

export default NewsMessage;

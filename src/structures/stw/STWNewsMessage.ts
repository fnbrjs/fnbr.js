import Base from '../../Base';
import Image from '../Image';
import STWNewsMessageButton from './STWNewsMessageButton';
import type Client from '../../Client';

/**
 * Represents a fortnite save the world news message
 */
class STWNewsMessage extends Base {
  /**
   * The news message's entry type
   */
  public contentType: string;

  /**
   * The news message's title
   */
  public title: string;

  /**
   * The news message's tab title
   */
  public tabTitle: string;

  /**
   * The news message's body
   */
  public body: string;

  /**
   * The news message's buttons
   */
  public buttons?: STWNewsMessageButton[];

  /**
   * The news message's images
   */
  public images?: Image[];

  /**
   * The news message's teaser title
   */
  public teaserTitle?: string;

  /**
   * The news message's teaser image
   */
  public teaserImages?: Image[];

  /**
   * @param client The main client
   * @param data The news message data
   */
  constructor(client: Client, data: any) {
    super(client);
    const newsData = data.contentFields;

    this.contentType = data.contentType;

    this.title = newsData.FullScreenTitle;
    this.tabTitle = newsData.FullScreenTabTitle;

    this.body = newsData.FullScreenBody;
    this.buttons = newsData.Buttons?.map((b: any) => new STWNewsMessageButton(this.client, b));
    this.images = newsData.FullScreenBackground?.Image?.map((i: any) => new Image(this.client, i));
    this.teaserTitle = newsData.TeaserTitle;
    this.teaserImages = newsData.TeaserBackground?.Image?.map((i: any) => new Image(this.client, i));
  }
}

export default STWNewsMessage;

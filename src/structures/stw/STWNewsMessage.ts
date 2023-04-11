import Base from '../../Base';
import Image from '../Image';
import type Client from '../../Client';

/**
 * Represents a fortnite save the world news message
 */
class STWNewsMessage extends Base {
  /**
   * The news message's title
   */
  public title: string;

  /**
   * The news message's body
   */
  public body: string;

  /**
   * The news message's image
   */
  public image: Image;

  /**
   * The news message's type
   */
  public type: string;

  /**
   * The news message's adspace
   */
  public adspace: string;

  /**
   * Whether the news message is hidden
   */
  public isHidden: boolean;

  /**
   * Whether the news message is a spotlight
   */
  public isSpotlight: boolean;

  /**
   * @param client The main client
   * @param data The news message data
   */
  constructor(client: Client, data: any) {
    super(client);

    this.title = data.title;
    this.body = data.body;
    this.image = new Image(this.client, { url: data.image });
    // eslint-disable-next-line no-underscore-dangle
    this.type = data._type;
    this.adspace = data.adspace;
    this.isHidden = data.hidden;
    this.isSpotlight = data.spotlight;
  }
}

export default STWNewsMessage;

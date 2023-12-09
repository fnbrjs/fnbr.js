import Base from '../../Base';
import STWNewsMessageVideo from './STWNewsMessageVideo';
import type Client from '../../Client';

/**
 * Represents a STW news message button
 */
class STWNewsMessageButton extends Base {
  /**
   * The button's action
   */
  public action?: {
    type: string;
    video?: STWNewsMessageVideo;
  };

  /**
   * The button's style
   */
  public style: string;

  /**
   * The button's style
   */
  public text: string;
  /**
   * @param client The main client
   * @param data The buttons's data
   */
  constructor(client: Client, data: any) {
    super(client);

    const action = data.Action;
    this.action = {
      // eslint-disable-next-line no-underscore-dangle
      type: action._type,
      video: action.video ? new STWNewsMessageVideo(client, action.video) : undefined,
    };
    this.style = data.Style;
    this.text = data.Text;
  }
}

export default STWNewsMessageButton;

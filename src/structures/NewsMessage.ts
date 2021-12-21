import Base from '../client/Base';
import Client from '../client/Client';

/**
 * Represents a fortnite news message
 */
class NewsMessage extends Base {
  entryType: any;
  body: any;
  /**
   * @param client The main client
   * @param data The news message data
   */
  constructor(client: Client, data: any) {
    super(client);

    const newsData = data.contentFields ? data.contentFields : data;

    this.entryType = newsData.entryType;
    this.body = newsData.body;
  }
}

export default NewsMessage;

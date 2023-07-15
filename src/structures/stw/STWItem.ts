import Base from '../../Base';
import type Client from '../../Client';
import type { STWProfileItemData } from '../../../resources/httpResponses';

/**
 * Represents a Save The World profile's item
 */
class STWItem extends Base {
  /**
   * The item ID
   */
  public id: string;

  /**
   * The item's template ID
   */
  public templateId: string;

  /**
   * The item's quantity
   */
  public quantity: number;

  /**
   * The item's attributes
   */
  public attributes: any;

  /**
   * @param client The main client
   * @param id The item ID
   * @param data The item's data
   */
  constructor(client: Client, id: string, data: STWProfileItemData) {
    super(client);

    this.id = id;
    this.templateId = data.templateId;
    this.quantity = data.quantity;
    this.attributes = data.attributes;
  }
}

export default STWItem;

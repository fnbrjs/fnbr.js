import STWItem from './STWItem';
import type Client from '../../Client';
import type { STWProfileResourceData } from '../../../resources/httpResponses';

/**
 * Represents a Save The World profile's resource
 */
class STWResource extends STWItem {
  /**
   * The resource's ID
   */
  public resourceId: string;

  /**
   * Whether the resource is marked as favorite
   */
  public isFavorite: boolean;

  /**
   * Whether the resource is marked as seen
   */
  public isSeen: boolean;

  /**
   * @param client The main client
   * @param id The item ID
   * @param data The resource data
   */
  constructor(client: Client, id: string, data: STWProfileResourceData) {
    super(client, id, data);

    [, this.resourceId] = data.templateId.split(':');

    this.isSeen = data.attributes.item_seen;
    this.isFavorite = data.attributes.favorite;
  }
}

export default STWResource;

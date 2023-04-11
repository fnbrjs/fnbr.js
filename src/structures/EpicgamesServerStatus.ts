import Base from '../Base';
import EpicgamesServerStatusComponent from './EpicgamesServerStatusComponent';
import EpicgamesServerStatusIncident from './EpicgamesServerStatusIncident';
import type { EpicgamesServerStatusData } from '../../resources/structs';
import type Client from '../Client';

/**
 * Represents an Epicgames server status
 */
class EpicgamesServerStatus extends Base {
  /**
   * The status page's id
   */
  public id: string;

  /**
   * The status page's name
   */
  public name: string;

  /**
   * The status page's url
   */
  public url: string;

  /**
   * The last time the status page was updated
   */
  public updatedAt: Date;

  /**
   * The server status indicator
   */
  public statusIndicator: string;

  /**
   * The server status description
   */
  public statusDescription: string;

  /**
   * The status page's components
   */
  public components: EpicgamesServerStatusComponent[];

  /**
   * The status page's incidents
   */
  public incidents: EpicgamesServerStatusIncident[];

  /**
   * The status page's scheduled maintenances
   */
  public scheduledMainteances: EpicgamesServerStatusIncident[];

  /**
   * @param client The main client
   * @param data The server status data
   */
  constructor(client: Client, data: EpicgamesServerStatusData) {
    super(client);

    this.id = data.page.id;
    this.name = data.page.name;
    this.url = data.page.url;
    this.updatedAt = new Date(data.page.updated_at);

    this.statusIndicator = data.status.indicator;
    this.statusDescription = data.status.description;

    this.components = data.components
      .filter((c) => !c.group_id)
      .map((c) => new EpicgamesServerStatusComponent(client, c, data.components));

    this.incidents = data.incidents.map((i) => new EpicgamesServerStatusIncident(client, i));

    this.scheduledMainteances = data.scheduled_maintenances.map((m) => new EpicgamesServerStatusIncident(client, m));
  }
}

export default EpicgamesServerStatus;

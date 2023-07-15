import Base from '../Base';
import type Client from '../Client';
import type { EpicgamesServerStatusIncidentUpdate } from '../../resources/structs';

/**
 * Represents an Epicgames server status
 */
class EpicgamesServerStatusIncident extends Base {
  /**
   * The incident's id
   */
  public id: string;

  /**
   * The incident's page id
   */
  public pageId: string;

  /**
   * The incident's name
   */
  public name: string;

  /**
   * The incident's status
   */
  public status: string;

  /**
   * The incident's impact
   */
  public impact: string;

  /**
   * The incident's short link
   */
  public shortLink: string;

  /**
   * The time when the incident was created
   */
  public createdAt: Date;

  /**
   * The last time when the incident was updated
   */
  public updatedAt?: Date;

  /**
   * The time when the incident was monitored
   */
  public monitoringAt?: Date;

  /**
   * The time when the incident was resolved
   */
  public resolvedAt?: Date;

  /**
   * The incident's updates
   */
  public incidentUpdates: EpicgamesServerStatusIncidentUpdate[];

  /**
   * @param client The main client
   * @param data The server status data
   */
  constructor(client: Client, data: any) {
    super(client);

    this.id = data.id;
    this.pageId = data.page_id;
    this.name = data.name;
    this.status = data.status;
    this.impact = data.impact;
    this.shortLink = data.short_link;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = data.updated_at ? new Date(data.updated_at) : undefined;
    this.monitoringAt = data.monitoring_at ? new Date(data.monitoring_at) : undefined;
    this.resolvedAt = data.resolved_at ? new Date(data.resolved_at) : undefined;

    this.incidentUpdates = data.incident_updates.map((u: any) => ({
      id: u.id,
      status: u.status,
      body: u.body,
      createdAt: new Date(u.created_at),
      displayAt: new Date(u.display_at),
      updatedAt: new Date(u.updated_at),
    }));
  }
}

export default EpicgamesServerStatusIncident;

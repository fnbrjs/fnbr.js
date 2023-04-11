import EpicgamesServerStatusIncident from './EpicgamesServerStatusIncident';
import type Client from '../Client';

/**
 * Represents an Epicgames server status
 */
class EpicgamesServerStatusScheduledMainteance extends EpicgamesServerStatusIncident {
  /**
   * The time the mainteance is scheduled for
   */
  public scheduledFor: Date;

  /**
   * The time the mainteance is scheduled until
   */
  public scheduledUntil: Date;

  /**
   * @param client The main client
   * @param data The server status data
   */
  constructor(client: Client, data: any) {
    super(client, data);

    this.scheduledFor = new Date(data.scheduled_for);
    this.scheduledUntil = new Date(data.scheduled_until);
  }
}

export default EpicgamesServerStatusScheduledMainteance;

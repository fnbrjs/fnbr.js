import Base from '../Base';
import type Client from '../Client';
import type { LightswitchData, LightswitchLauncherInfo } from '../../resources/structs';

/**
 * Represents a Fortnite server status
 */
class FortniteServerStatus extends Base {
  /**
   * The service's instance id
   */
  public serviceInstanceId: string;

  /**
   * The server status
   */
  public status: string;

  /**
   * The server status message
   */
  public message: string;

  /**
   * The server status mainteance uri
   */
  public maintenanceUri?: string;

  /**
   * The overwritten catalog ids
   */
  public overrideCatalogIds: string[];

  /**
   * The client user's allowed service actions
   */
  public allowedActions: string[];

  /**
   * Whether the client user is banned from the service
   */
  public isBanned: boolean;

  /**
   * The service's launcher info
   */
  public launcherInfoDTO: LightswitchLauncherInfo;

  /**
   * @param client The main client
   * @param data The server status data
   */
  constructor(client: Client, data: LightswitchData) {
    super(client);

    this.serviceInstanceId = data.serviceInstanceId;
    this.status = data.status;
    this.message = data.message;
    this.maintenanceUri = data.maintenanceUri;
    this.overrideCatalogIds = data.overrideCatalogIds;
    this.allowedActions = data.allowedActions;
    this.isBanned = data.banned;
    this.launcherInfoDTO = data.launcherInfoDTO;
  }
}

export default FortniteServerStatus;

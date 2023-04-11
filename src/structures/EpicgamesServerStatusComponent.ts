import Base from '../Base';
import type Client from '../Client';
import type { EpicgamesServerStatusData } from '../../resources/structs';

/**
 * Represents an Epicgames server status
 */
class EpicgamesServerStatusComponent extends Base {
  /**
   * The component's id
   */
  public id: string;

  /**
   * The component's name
   */
  public name: string;

  /**
   * The component's status
   */
  public status: string;

  /**
   * The time the component was created
   */
  public createdAt: Date;

  /**
   * The last time the component was updated
   */
  public updatedAt: Date;

  /**
   * The component's position
   */
  public position: number;

  /**
   * The component's description
   */
  public description?: string;

  /**
   * Whether this component is showcased
   */
  public isShowcase: boolean;

  /**
   * The component's start date
   */
  public startDate?: Date;

  /**
   * The component's group id
   */
  public groupId?: string;

  /**
   * Whether this component should only be shown if it's degraded
   */
  public onlyShowIfDegraded: boolean;

  /**
   * Whether this component is a group
   */
  public isGroup: boolean;

  /**
   * The component's subcomponents
   */
  // eslint-disable-next-line no-use-before-define
  public components?: EpicgamesServerStatusComponent[];

  /**
   * @param client The main client
   * @param data The server status component data
   * @param components The server status components
   */
  constructor(client: Client, data: EpicgamesServerStatusData['components'][0], components: EpicgamesServerStatusData['components']) {
    super(client);

    this.id = data.id;
    this.name = data.name;
    this.status = data.status;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
    this.position = data.position ?? undefined;
    this.description = data.description ?? undefined;
    this.isShowcase = !!data.showcase;
    this.startDate = data.start_date ? new Date(data.start_date) : undefined;
    this.groupId = data.group_id ?? undefined;
    this.isGroup = !!data.group;
    this.onlyShowIfDegraded = !!data.only_show_if_degraded;

    if (data.components) {
      this.components = components
        .filter((c) => data.components.includes(c.id))
        .map((c) => new EpicgamesServerStatusComponent(client, c, components));
    }
  }
}

export default EpicgamesServerStatusComponent;

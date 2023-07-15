import STWItem from './STWItem';
import type Client from '../../Client';
import type { STWProfileLockerData } from '../../../resources/httpResponses';
import type { STWLockerBannerData, STWLockerSlotsData } from '../../../resources/structs';

/**
 * Represents a Save The World profile's locker
 */
class STWLocker extends STWItem {
  /**
   * The profile's banner data
   */
  public banner: STWLockerBannerData;

  /**
   * The locker's name
   */
  public lockerName?: string;

  /**
   * The amount of times the locker has been used
   */
  public useCount: number;

  /**
   * The locker's slots
   */
  public slots: STWLockerSlotsData;

  /**
   * @param client The main client
   * @param id The item ID
   * @param data The locker data
   */
  constructor(client: Client, id: string, data: STWProfileLockerData) {
    super(client, id, data);

    this.banner = {
      icon: data.attributes.banner_icon_template,
      color: data.attributes.banner_color_template,
    };

    this.lockerName = data.attributes.locker_name;
    this.useCount = data.attributes.use_count;

    this.slots = data.attributes.locker_slots_data.slots;
  }
}

export default STWLocker;

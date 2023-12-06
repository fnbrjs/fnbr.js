import Meta from '../../util/Meta';
import type { Island, PartySchema } from '../../../resources/structs';

/**
 * Represents a party's meta
 */
class PartyMeta extends Meta<PartySchema> {
  /**
   * The currently selected island
   */
  public get island(): Island | undefined {
    return this.get('Default:SelectedIsland_j')?.SelectedIsland;
  }

  /**
   * The region ID (EU, NAE, NAW, etc.)
   */
  public get regionId(): string | undefined {
    const regionId = this.get('Default:RegionId_s');
    if (typeof regionId !== 'string' || regionId.length === 0) {
      return undefined;
    }

    return regionId;
  }

  /**
   * The custom matchmaking key
   */
  public get customMatchmakingKey(): string | undefined {
    const key = this.get('Default:CustomMatchKey_s');

    if (typeof key !== 'string' || key.length === 0) return undefined;
    return key;
  }

  /**
   * The squad fill status
   */
  public get squadFill() {
    return !!this.get('Default:AthenaSquadFill_b');
  }
}

export default PartyMeta;

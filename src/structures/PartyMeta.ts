import { PartySchema, Playlist } from '../../resources/structs';
import Meta from '../util/Meta';
import Party from './Party';

/**
 * Represents a party's meta
 */
class PartyMeta extends Meta<PartySchema> {
  /**
   * The party
   */
  public party: Party;

  /**
   * @param party The party
   * @param schema The schema
   */
  constructor(party: Party, schema: PartySchema) {
    super(schema);

    this.party = party;
  }

  /**
   * The currently selected playlist
   */
  public get playlist(): Playlist | undefined {
    return this.get('Default:PlaylistData_j')?.PlaylistData;
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

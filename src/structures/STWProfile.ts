import Client from '../client/Client';
import Base from '../client/Base';
import { CurveTable } from '../util/CurveTable';
import HomebaseRatingMapping from '../../resources/STWMappings.json';
import {
  STWProfileData,
  STWProfileItemWithId,
  STWProfileStats,
} from '../../resources/httpResponses';

/**
 * STW Power level curve table reader
 */
const powerLevelCurve = new CurveTable(
  HomebaseRatingMapping[0].ExportValue.UIMonsterRating.Keys
);

interface KeyValuePair {
  [key: string]: any;
}

/**
 * Represents a Save The World profile
 */
class STWProfile extends Base {
  /**
   * The profile ID.
   * NOTE: THIS IS NOT THE ACCOUNT ID
   */
  public id: string;

  /**
   * The profile's creation date
   */
  public createdAt: Date;

  /**
   * The profile's last updated date
   */
  public updatedAt: Date;

  /**
   * The profile's revision
   */
  public revision: number;

  /**
   * The profile's wipe number
   */
  public wipeNumber: number;

  /**
   * The ID of the account this profile belongs to
   */
  public accountId: string;

  /**
   * The profile version
   */
  public version: string;

  /**
   * The profile's command revision
   */
  public commandRevision: number;

  /**
   * The profile's items
   */
  public items: STWProfileItemWithId[];

  /**
   * The profile's stats
   */
  public stats: STWProfileStats;

  public powerLevel: number;

  public leadSynergy: KeyValuePair = {
    trainingteam: 'IsTrainer',
    fireteamalpha: 'IsSoldier',
    closeassaultsquad: 'IsMartialArtist',
    thethinktank: 'IsInventor',
    emtsquad: 'IsDoctor',
    corpsofengineering: 'IsEngineer',
    scoutingparty: 'IsExplorer',
    gadgeteers: 'IsGadgeteer',
  };

  /**
   * Survivor Squads for the Profile
   */
  public survivorSquads: KeyValuePair = {
    trainingteam: [],
    fireteamalpha: [],
    closeassaultsquad: [],
    thethinktank: [],
    emtsquad: [],
    corpsofengineering: [],
    scoutingparty: [],
    gadgeteers: [],
  };

  /**
   * @param client The main client
   * @param data The profile data
   */
  constructor(client: Client, data: STWProfileData) {
    super(client);

    this.id = data._id;
    this.createdAt = new Date(data.created);
    this.updatedAt = new Date(data.updated);
    this.revision = data.rvn;
    this.wipeNumber = data.wipeNumber;
    this.accountId = data.accountId;
    this.version = data.version;
    this.commandRevision = data.commandRevision;

    this.items = Object.keys(data.items).map((k) => ({
      id: k,
      ...data.items[k],
    }));
    this.stats = data.stats.attributes;
  }

  /**
   * Returns all survivors of the profile
   */
  public get workers(): Array<any> {
    let arr = [];
    for (const item of this.items) {
      if (
        item.templateId.startsWith('Worker:') &&
        item.attributes.squad_slot_idx !== -1 &&
        item.attributes.squad_id.length !== 0
      ) {
        arr.push(item);
      }
    }
    return arr;
  }

  /**
   * Update survivor squads
   */
  public updateSurvivorSquads(): KeyValuePair {
    let survivors = this.workers;
    for (let s of survivors) {
      let squad = s.attributes.squad_id;
      this.survivorSquads[squad.split('_')[3]].push(s);
    }

    return this.survivorSquads;
  }
}

export default STWProfile;

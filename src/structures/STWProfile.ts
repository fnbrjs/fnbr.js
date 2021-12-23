/* eslint-disable class-methods-use-this */
/* eslint-disable no-restricted-syntax */
import Client from '../client/Client';
import CurveTable from '../util/CurveTable';
import HomebaseRatingMapping from '../../resources/STWMappings.json';
import {
  STWProfileData,
  STWProfileLockerData,
  STWProfileResourceData,
  STWProfileSurvivorData,
} from '../../resources/httpResponses';
import {
  STWFORTStats,
  STWSurvivorSquads,
  UserData,
} from '../../resources/structs';
import STWSurvivor from './STWSurvivor';
import STWItem from './STWItem';
import STWStats from './STWStats';
import STWLocker from './STWLocker';
import User from './User';
import STWResource from './STWResource';

/**
 * Represents a Save The World profile
 */
class STWProfile extends User {
  /**
   * The profile ID
   */
  public profileId: string;

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
  public items: (STWItem | STWSurvivor | STWLocker | STWResource)[];

  /**
   * The profile's stats
   */
  public stats: STWStats;

  /**
   * The profile's power level curve calculator
   */
  private powerLevelCurve: CurveTable;

  /**
   * @param client The main client
   * @param data The profile data
   * @param userData The user data
   */
  constructor(client: Client, data: STWProfileData, userData: UserData) {
    super(client, userData);

    this.powerLevelCurve = new CurveTable(HomebaseRatingMapping[0].ExportValue.UIMonsterRating.Keys);

    this.profileId = data._id;
    this.createdAt = new Date(data.created);
    this.updatedAt = new Date(data.updated);
    this.revision = data.rvn;
    this.wipeNumber = data.wipeNumber;
    this.version = data.version;
    this.commandRevision = data.commandRevision;

    this.items = [];

    for (const [itemId, item] of Object.entries(data.items)) {
      const itemType = item.templateId.split(':')[0];

      switch (itemType) {
        case 'Worker':
          this.items.push(new STWSurvivor(this.client, itemId, item as STWProfileSurvivorData));
          break;
        case 'CosmeticLocker':
          this.items.push(new STWLocker(this.client, itemId, item as STWProfileLockerData));
          break;
        case 'AccountResource':
          this.items.push(new STWResource(this.client, itemId, item as STWProfileResourceData));
          break;
        default:
          this.items.push(new STWItem(this.client, itemId, item));
      }
    }

    this.stats = new STWStats(this.client, data.stats.attributes);
  }

  /**
   * Returns the profile's survivors
   */
  public get survivors() {
    return this.items.filter((i) => i instanceof STWSurvivor) as STWSurvivor[];
  }

  /**
   * The profile's survivor squads
   */
  public get survivorSquads() {
    const survivorSquads: STWSurvivorSquads = {
      trainingteam: [],
      fireteamalpha: [],
      closeassaultsquad: [],
      thethinktank: [],
      emtsquad: [],
      corpsofengineering: [],
      scoutingparty: [],
      gadgeteers: [],
    };

    for (const survivor of this.survivors.filter((s) => !!s.squad)) {
      survivorSquads[survivor.squad!.name].push(survivor);
    }

    return survivorSquads;
  }

  /**
   * The profile's locker
   */
  public get locker() {
    return this.items.find((i) => i instanceof STWLocker) as STWLocker;
  }

  /**
   * The profile's resources
   */
  public get resources() {
    return this.items.filter((i) => i instanceof STWResource) as STWResource[];
  }

  /**
   * The profile's power level
   */
  public get powerLevel(): number {
    const totalFORTStats = Object.values(this.FORTStats).reduce((prev, cur) => prev + cur);

    return this.powerLevelCurve.eval(totalFORTStats * 4);
  }

  /**
   * The profile's ventures power level
   */
  public get venturesPowerLevel(): number {
    const totalFORTStats = Object.values(this.venturesFORTStats).reduce((prev, cur) => prev + cur);

    return this.powerLevelCurve.eval(totalFORTStats * 4);
  }

  /**
   * The profile's FORT stats
   */
  public get FORTStats() {
    const FORTStats: STWFORTStats = {
      fortitude: 0,
      offense: 0,
      resistance: 0,
      tech: 0,
    };

    for (const FORTStat of [this.survivorFORTStats, this.researchFORTStats]) {
      (Object.keys(FORTStat) as (keyof STWFORTStats)[]).forEach((k) => {
        FORTStats[k] += FORTStat[k];
      });
    }

    return FORTStats;
  }

  /**
   * The profile's survivor squads' FORT stats
   */
  public get survivorFORTStats() {
    const survivorFORTStats: STWFORTStats = {
      fortitude: 0,
      offense: 0,
      resistance: 0,
      tech: 0,
    };

    for (const survivorSquad of Object.values(this.survivorSquads) as STWSurvivor[][]) {
      const leadSurvivor = survivorSquad.find((s) => s.squad!.slotIdx === 0);

      for (const survivor of survivorSquad) {
        let totalBonus = survivor.powerLevel;
        if (survivor.squad!.slotIdx === 0) totalBonus += survivor.leadBonus;
        else if (leadSurvivor) totalBonus += survivor.calcSurvivorBonus(leadSurvivor);

        switch (survivor.squad!.type) {
          case 'medicine':
            survivorFORTStats.fortitude += totalBonus;
            break;
          case 'arms':
            survivorFORTStats.offense += totalBonus;
            break;
          case 'synthesis':
            survivorFORTStats.tech += totalBonus;
            break;
          case 'scavenging':
            survivorFORTStats.resistance += totalBonus;
            break;
        }
      }
    }

    return survivorFORTStats;
  }

  /**
   * The profile's research FORT stats
   */
  public get researchFORTStats() {
    const survivorFORTStats: STWFORTStats = {
      fortitude: 0,
      offense: 0,
      resistance: 0,
      tech: 0,
    };

    for (const value of this.items) {
      if (value.templateId.startsWith('Stat:') && !value.templateId.includes('phoenix')) {
        if (value.templateId.includes('fortitude')) survivorFORTStats.fortitude += value.quantity;
        else if (value.templateId.includes('resistance')) survivorFORTStats.resistance += value.quantity;
        else if (value.templateId.includes('technology')) survivorFORTStats.tech += value.quantity;
        else if (value.templateId.includes('offense')) survivorFORTStats.offense += value.quantity;
      }
    }

    return survivorFORTStats;
  }

  /**
   * The profile's ventures FORT stats
   */
  public get venturesFORTStats() {
    const venturesFORTStats: STWFORTStats = {
      fortitude: 0,
      offense: 0,
      resistance: 0,
      tech: 0,
    };

    for (const value of this.items) {
      if (value.templateId.startsWith('Stat:') && value.templateId.includes('phoenix')) {
        if (value.templateId.includes('fortitude')) venturesFORTStats.fortitude += value.quantity;
        else if (value.templateId.includes('resistance')) venturesFORTStats.resistance += value.quantity;
        else if (value.templateId.includes('technology')) venturesFORTStats.tech += value.quantity;
        else if (value.templateId.includes('offense')) venturesFORTStats.offense += value.quantity;
      }
    }

    return venturesFORTStats;
  }

  /**
   * Whether the profile is a founder
   * (Whether it can receive vbucks rewards)
   */
  public get isFounder() {
    return this.items.some((i) => i.templateId === 'Token:receivemtxcurrency');
  }
}

export default STWProfile;

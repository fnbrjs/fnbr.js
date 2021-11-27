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

interface ResourceObject {
  [key: string]: number;
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

  /**
   * FORT Stats for the profile
   */
  public FORT: ResourceObject = {
    fortitude: 0,
    resistance: 0,
    offense: 0,
    tech: 0,
  };

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

  /**
   * Calculate Power Level
   */
  public get powerLevel(): number {
    this.updateSurvivorSquads();
    this.calcSurvivorFORT();
    this.calcResearchForts();
    // this.calcAccountLevelForts();

    let total =
      this.FORT.fortitude +
      this.FORT.resistance +
      this.FORT.offense +
      this.FORT.tech;

    return powerLevelCurve.eval(total * 4);
  }

  /**
   * Calculate FORT Stats from survivor squads
   */
  public calcSurvivorFORT(): ResourceObject {
    for (let i = 0; i < Object.keys(this.survivorSquads).length; i++) {
      let squadHasLeader: boolean = false;
      let squads = this.survivorSquads[Object.keys(this.survivorSquads)[i]];
      let leadSurvivor: any;

      for (let survivor of squads) {
        if (survivor.attributes.squad_slot_idx == 0) {
          leadSurvivor = survivor;
          squadHasLeader = true;

          let totalBonus =
            this.leadBonus(survivor) + this.returnSurvivorPl(survivor);

          switch (survivor.attributes.squad_id) {
            case 'squad_attribute_medicine_trainingteam':
              this.FORT.fortitude += totalBonus;
              break;
            case 'squad_attribute_medicine_emtsquad':
              this.FORT.fortitude += totalBonus;
              break;

            case 'squad_attribute_arms_closeassaultsquad':
              this.FORT.offense += totalBonus;
              break;
            case 'squad_attribute_arms_fireteamalpha':
              this.FORT.offense += totalBonus;
              break;

            case 'squad_attribute_synthesis_corpsofengineering':
              this.FORT.tech += totalBonus;
              break;
            case 'squad_attribute_synthesis_thethinktank':
              this.FORT.tech += totalBonus;
              break;

            case 'squad_attribute_scavenging_scoutingparty':
              this.FORT.resistance += totalBonus;
              break;
            case 'squad_attribute_scavenging_gadgeteers':
              this.FORT.resistance += totalBonus;
              break;
          }
        }
      }

      for (let survivor of squads) {
        if (survivor.attributes.squad_slot_idx != 0) {
          let totalSrvBonus: number = 0;
          if (squadHasLeader) {
            totalSrvBonus =
              this.survivorBonus(leadSurvivor, survivor) +
              this.returnSurvivorPl(survivor);
          } else {
            totalSrvBonus = this.returnSurvivorPl(survivor);
          }

          switch (survivor.attributes.squad_id) {
            case 'squad_attribute_medicine_trainingteam':
              this.FORT.fortitude += totalSrvBonus;
              break;
            case 'squad_attribute_medicine_emtsquad':
              this.FORT.fortitude += totalSrvBonus;
              break;

            case 'squad_attribute_arms_closeassaultsquad':
              this.FORT.offense += totalSrvBonus;
              break;
            case 'squad_attribute_arms_fireteamalpha':
              this.FORT.offense += totalSrvBonus;
              break;

            case 'squad_attribute_synthesis_corpsofengineering':
              this.FORT.tech += totalSrvBonus;
              break;
            case 'squad_attribute_synthesis_thethinktank':
              this.FORT.tech += totalSrvBonus;
              break;

            case 'squad_attribute_scavenging_scoutingparty':
              this.FORT.resistance += totalSrvBonus;
              break;
            case 'squad_attribute_scavenging_gadgeteers':
              this.FORT.resistance += totalSrvBonus;
              break;
          }
        }
      }
    }

    return this.FORT;
  }

  /**
   * Returns research FORT stats for the profile
   */
  public calcResearchForts(): ResourceObject {
    for (const value of this.items) {
      if (
        value.templateId.startsWith('Stat:') &&
        !value.templateId.includes('phoenix')
      ) {
        if (value.templateId.includes('fortitude'))
          this.FORT.fortitude += value.quantity;
        if (value.templateId.includes('resistance'))
          this.FORT.resistance += value.quantity;
        if (value.templateId.includes('technology'))
          this.FORT.tech += value.quantity;
        if (value.templateId.includes('offense'))
          this.FORT.offense += value.quantity;
      }
    }

    return this.FORT;
  }

  /**
   * Calculate lead survivor bonus
   * @param item The survivor
   */
  public leadBonus(item: KeyValuePair) {
    let leaderMatch = item.attributes.managerSynergy.split('.')[2];
    if (
      this.leadSynergy[`${item.attributes.squad_id.split('_')[3]}`] ==
      leaderMatch
    ) {
      return this.returnSurvivorPl(item); //there is a bonus
    } else {
      return 0; // no bonuses
    }
  }

  /**
   * Calculate survivor bonus
   * @param lead The lead survivor
   * @param survivor The survivor
   */
  public survivorBonus(lead: KeyValuePair, survivor: KeyValuePair): number {
    let leadPersonality = lead.attributes.personality.split('.')[3];
    let survivorPersonality = survivor.attributes.personality.split('.')[3];
    let leadRarity = lead.templateId.split(':')[1].split('_')[1];

    if (survivorPersonality == leadPersonality) {
      if (leadRarity == 'sr') return 8; //mythic
      if (leadRarity == 'vr') return 5; //legendary
      if (leadRarity == 'r') return 4; //epic
      if (leadRarity == 'uc') return 3; //rare
      if (leadRarity == 'c') return 2; //uncommon
    } else {
      //penalty if mythic
      if (leadRarity == 'sr') {
        if (this.returnSurvivorPl(survivor) <= 2) return 0; //when taking into account the common survivors which is pl 1 and if you are going to subtract 2 this will leave you with -1, so we return 0.
        return -2;
      }
      // return 0;
    }
    return 0;
  }

  /**
   * Returns the survivor's pl
   * @param item The survivor
   */
  public returnSurvivorPl(item: KeyValuePair) {
    let BASEPOWER: number,
      LVL: number,
      LVLCONSTANT: number,
      STARLVL: number,
      EVOCONSTANT: number,
      rarity: any;

    if (item.attributes.squad_slot_idx != 0) {
      let special = false;
      if (item.templateId.startsWith('Worker:worker_halloween_troll')) {
        rarity = this.returnSurvivorRarity(
          item.templateId.split(':')[1].split('_')[3],
          false
        );
        special = true;
      }
      if (item.templateId.startsWith('Worker:worker_halloween_lobber')) {
        rarity = this.returnSurvivorRarity(
          item.templateId.split(':')[1].split('_')[3],
          false
        );
        special = true;
      }
      if (item.templateId.startsWith('Worker:worker_leprechaun')) {
        rarity = this.returnSurvivorRarity(
          item.templateId.split(':')[1].split('_')[2],
          false
        );
        special = true;
      }
      if (item.templateId.startsWith('Worker:worker_halloween_smasher')) {
        rarity = this.returnSurvivorRarity(
          item.templateId.split(':')[1].split('_')[3],
          false
        );
        special = true;
      }
      if (item.templateId.startsWith('Worker:worker_karolina')) {
        rarity = this.returnSurvivorRarity(
          item.templateId.split(':')[1].split('_')[2],
          false
        );
        special = true;
      }
      if (item.templateId.startsWith('Worker:worker_joel')) {
        rarity = this.returnSurvivorRarity(
          item.templateId.split(':')[1].split('_')[2],
          false
        );
        special = true;
      }
      if (item.templateId.startsWith('Worker:worker_halloween_husky_')) {
        rarity = this.returnSurvivorRarity(
          item.templateId.split(':')[1].split('_')[3],
          false
        );
        special = true;
      }
      if (item.templateId.startsWith('Worker:worker_halloween_husk_')) {
        rarity = this.returnSurvivorRarity(
          item.templateId.split(':')[1].split('_')[3],
          false
        );
        special = true;
      }
      if (item.templateId.startsWith('Worker:worker_halloween_husky')) {
        rarity = this.returnSurvivorRarity(
          item.templateId.split(':')[1].split('_')[3],
          false
        );
        special = true;
      }
      if (item.templateId.startsWith('Worker:worker_halloween_pitcher_')) {
        rarity = this.returnSurvivorRarity(
          item.templateId.split(':')[1].split('_')[3],
          false
        );
        special = true;
      }
      if (!special) {
        rarity = this.returnSurvivorRarity(
          item.templateId.split(':')[1].split('_')[1],
          false
        );
      }

      BASEPOWER = this.returnBasePower(rarity);
      LVLCONSTANT = this.returnLvlConstant(rarity, false);
      STARLVL = parseInt(item.templateId.slice(-1));
      EVOCONSTANT = this.returnEVOConstant(rarity, false);
      LVL = item.attributes.level;
    } else {
      rarity = this.returnSurvivorRarity(
        item.templateId.split(':')[1].split('_')[1],
        true
      );
      BASEPOWER = this.returnLeadBasePower(rarity);
      LVLCONSTANT = this.returnLvlConstant(rarity, true);
      STARLVL = parseInt(item.templateId.slice(-1));
      EVOCONSTANT = this.returnEVOConstant(rarity, true);
      LVL = item.attributes.level;
    }

    return Math.round(
      BASEPOWER + (LVL - 1) * LVLCONSTANT + (STARLVL - 1) * EVOCONSTANT
    );
  }

  /**
   * @param rarity Enum of the survivor rarity
   * @param lead is the survivor lead
   */
  public returnSurvivorRarity(rarity: string, lead: boolean): number {
    let rarities: KeyValuePair = {
      c: [1, 1],
      uc: [2, 2],
      r: [3, 3],
      vr: [4, 4],
      sr: [5, 5],
      ur: [6, 0],
    };
    return rarities[rarity][lead ? 1 : 0] || 0;
  }

  /**
   * @param rarity Enum of the survivor rarity
   */
  public returnBasePower(rarity: number): number {
    return 5 * rarity - 5;
  }

  /**
   * @param rarity Enum of the survivor rarity
   */
  public returnLeadBasePower(rarity: number): number {
    return 5 * rarity;
  }

  /**
   * @param rarity Enum of the survivor rarity
   * @param lead is the survivor lead
   */
  public returnEVOConstant(rarity: number, lead: boolean): number {
    const EVOConstant: KeyValuePair = {
      1: [5, 5],
      2: [6.35, 6.35],
      3: [7, 7],
      4: [8, 8],
      5: [9, 9],
      6: [9.85, 0],
    };
    return EVOConstant[rarity][lead ? 1 : 0];
  }

  /**
   * @param rarity Enum of the survivor rarity
   * @param lead is the survivor lead
   */
  public returnLvlConstant(rarity: number, lead: boolean): number {
    const LvlConstant: KeyValuePair = {
      1: [1, 1],
      2: [1.08, 1.08],
      3: [1.245, 1.245],
      4: [1.374, 1.374],
      5: [1.5, 1.5],
      6: [1.645, 0],
    };
    return LvlConstant[rarity][lead ? 1 : 0];
  }
}

export default STWProfile;

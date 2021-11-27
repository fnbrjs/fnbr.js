/* eslint-disable class-methods-use-this */
/* eslint-disable no-restricted-syntax */
import Client from '../client/Client';
import Base from '../client/Base';
import CurveTable from '../util/CurveTable';
import HomebaseRatingMapping from '../../resources/STWMappings.json';
import {
  STWProfileData,
  STWProfileItemWithId,
  STWProfileStats,
} from '../../resources/httpResponses';
import {
  STWFORTStats,
  STWSurvivorSquads,
  STWWorker,
} from '../../resources/structs';
import { STWLeadSynergy } from '../../enums/Enums';
import {
  calcSTWEVOConstant, calcSTWLevelConstant, calcSTWSurvivorRarity, parseSTWWorkerTemplateId,
} from '../util/Util';

export const STWWorkerTemplateIdStart = Object.freeze([
  'Worker:worker_halloween_troll_',
  'Worker:worker_halloween_lobber_',
  'Worker:worker_leprechaun_',
  'Worker:worker_halloween_smasher_',
  'Worker:worker_karolina_',
  'Worker:worker_joel',
  'Worker:worker_halloween_husky_',
  'Worker:worker_halloween_husk_',
  'Worker:worker_halloween_husky_',
]);

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
   * The profile's power level curve reader
   */
  private powerLevelCurve: CurveTable;

  /**
   * @param client The main client
   * @param data The profile data
   */
  constructor(client: Client, data: STWProfileData) {
    super(client);

    this.powerLevelCurve = new CurveTable(HomebaseRatingMapping[0].ExportValue.UIMonsterRating.Keys);

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
   * Returns the profile's workers
   */
  public get workers() {
    const workers: STWWorker[] = [];
    for (const item of this.items) {
      if (item.templateId.startsWith('Worker:')) {
        const parsedWorker = parseSTWWorkerTemplateId(item.templateId);

        workers.push({
          templateId: item.templateId,
          type: parsedWorker.type,
          managerSynergy: item.attributes.managerSynergy,
          name: parsedWorker.name,
          tier: parsedWorker.tier,
          rarity: parsedWorker.rarity,
          gender: item.attributes.gender === '1' ? 'male' : 'female',
          level: item.attributes.level,
          squad: item.attributes.squad_id ? {
            id: item.attributes.squad_id,
            slotIdx: item.attributes.squad_slot_idx,
          } : undefined,
          portrait: item.attributes.portrait,
          maxLevelBonus: item.attributes.max_level_bonus,
          personality: item.attributes.personality,
          xp: item.attributes.xp,
          buildingSlot: item.attributes.building_slot_used !== -1 ? {
            buildingId: item.attributes.slotted_building_id,
          } : undefined,
          setBonus: item.attributes.set_bonus,
          isSeen: item.attributes.item_seen,
          isFavorite: item.attributes.favorite,
        });
      }
    }

    return workers;
  }

  /**
   * The profile's survivor squads
   */
  public get survivorSquads() {
    const survivors = this.workers;

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

    for (const survivor of survivors.filter((s) => !!s.squad)) {
      const squad = survivor.squad!.id;
      survivorSquads[squad.split('_')[3] as keyof STWSurvivorSquads].push(survivor);
    }

    return survivorSquads;
  }

  /**
   * Calculate Power Level
   */
  public get powerLevel(): number {
    const totalFORTStats = Object.values(this.FORTStats).reduce((prev, cur) => prev + cur);

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

    for (const survivorSquad of Object.values(this.survivorSquads) as STWWorker[][]) {
      let squadHasLeader = false;
      let leadSurvivor: any;

      for (const survivor of survivorSquad) {
        if (survivor.squad?.slotIdx === 0) {
          leadSurvivor = survivor;
          squadHasLeader = true;

          const totalBonus = this.calcSurvivorLeadBonus(survivor) + this.calcSurvivorPowerLevel(survivor);

          switch (survivor.squad.id) {
            case 'squad_attribute_medicine_trainingteam':
              survivorFORTStats.fortitude += totalBonus;
              break;
            case 'squad_attribute_medicine_emtsquad':
              survivorFORTStats.fortitude += totalBonus;
              break;

            case 'squad_attribute_arms_closeassaultsquad':
              survivorFORTStats.offense += totalBonus;
              break;
            case 'squad_attribute_arms_fireteamalpha':
              survivorFORTStats.offense += totalBonus;
              break;

            case 'squad_attribute_synthesis_corpsofengineering':
              survivorFORTStats.tech += totalBonus;
              break;
            case 'squad_attribute_synthesis_thethinktank':
              survivorFORTStats.tech += totalBonus;
              break;

            case 'squad_attribute_scavenging_scoutingparty':
              survivorFORTStats.resistance += totalBonus;
              break;
            case 'squad_attribute_scavenging_gadgeteers':
              survivorFORTStats.resistance += totalBonus;
              break;
          }
        }
      }

      for (const survivor of survivorSquad) {
        if (survivor.squad?.slotIdx !== 0) {
          let totalSrvBonus = this.calcSurvivorPowerLevel(survivor);
          if (squadHasLeader) totalSrvBonus += this.calcSurvivorBonus(leadSurvivor, survivor);

          switch (survivor.squad?.id) {
            case 'squad_attribute_medicine_trainingteam':
              survivorFORTStats.fortitude += totalSrvBonus;
              break;
            case 'squad_attribute_medicine_emtsquad':
              survivorFORTStats.fortitude += totalSrvBonus;
              break;

            case 'squad_attribute_arms_closeassaultsquad':
              survivorFORTStats.offense += totalSrvBonus;
              break;
            case 'squad_attribute_arms_fireteamalpha':
              survivorFORTStats.offense += totalSrvBonus;
              break;

            case 'squad_attribute_synthesis_corpsofengineering':
              survivorFORTStats.tech += totalSrvBonus;
              break;
            case 'squad_attribute_synthesis_thethinktank':
              survivorFORTStats.tech += totalSrvBonus;
              break;

            case 'squad_attribute_scavenging_scoutingparty':
              survivorFORTStats.resistance += totalSrvBonus;
              break;
            case 'squad_attribute_scavenging_gadgeteers':
              survivorFORTStats.resistance += totalSrvBonus;
              break;
          }
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
   * Calculate a survivor's lead bonus
   * @param survivor The survivor
   */
  public calcSurvivorLeadBonus(survivor: STWWorker) {
    const leaderMatch = survivor.managerSynergy!.split('.')[2];

    if (STWLeadSynergy[survivor.squad!.id.split('_')[3] as keyof STWSurvivorSquads] === leaderMatch) {
      return this.calcSurvivorPowerLevel(survivor);
    }

    return 0;
  }

  /**
   * Calculate a survivor's bonus
   * @param lead The lead survivor
   * @param survivor The survivor
   */
  public calcSurvivorBonus(lead: STWWorker, survivor: STWWorker): number {
    const leadPersonality = lead.personality.split('.')[3];
    const survivorPersonality = survivor.personality.split('.')[3];
    const leadRarity = lead.templateId.split(':')[1].split('_')[1];

    if (survivorPersonality === leadPersonality) {
      if (leadRarity === 'sr') return 8;
      if (leadRarity === 'vr') return 5;
      if (leadRarity === 'r') return 4;
      if (leadRarity === 'uc') return 3;
      if (leadRarity === 'c') return 2;
    } else if (leadRarity === 'sr') {
      if (this.calcSurvivorPowerLevel(survivor) <= 2) return 0;
      return -2;
    }

    return 0;
  }

  /**
   * Calculate a survivor's power level
   * @param survivor The survivor
   */
  public calcSurvivorPowerLevel(survivor: STWWorker) {
    const rarityValue = calcSTWSurvivorRarity(survivor.rarity, survivor.squad?.slotIdx === 0);

    return Math.round(
      (5 * rarityValue) - (survivor.squad?.slotIdx === 0 ? 0 : 5)
      + (survivor.level - 1) * calcSTWLevelConstant(rarityValue, survivor.squad?.slotIdx === 0)
      + (survivor.tier - 1) * calcSTWEVOConstant(rarityValue, survivor.squad?.slotIdx === 0));
  }
}

export default STWProfile;

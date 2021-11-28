import Client from '../client/Client';
import STWItem from './STWItem';
import {
  parseSTWSurvivorTemplateId, calcSTWSurvivorRarity, calcSTWEVOConstant,
  calcSTWLevelConstant, calcSTWSurvivorPowerLevel, calcSTWSurvivorLeadBonus,
  calcSTWSurvivorBonus,
} from '../util/Util';
import {
  STWSurvivorSquadData, STWSurvivorType, STWSurvivorRarity,
  STWSurvivorSquads, STWSurvivorSquadType,
} from '../../resources/structs';
import { STWProfileSurvivorData } from '../../resources/httpResponses';

/**
 * Represents a Save The World profile's survivor
 */
class STWSurvivor extends STWItem {
  /**
   * The survivor's type.
   * Special means it's from an event (eg. halloween).
   * Manager means it's a lead survivor
   */
  public type: STWSurvivorType;

  /**
   * The survivor's name (will be undefined for basic survivors)
   */
  public name?: string;

  /**
   * The survivor's tier
   */
  public tier: number;

  /**
   * The survivor's rarity
   */
  public rarity: STWSurvivorRarity;

  /**
   * The survivor's manager synergy
   */
  public managerSynergy?: string;

  /**
   * The survivor's gender
   */
  public gender: 'male' | 'female';

  /**
   * The survivor's level
   */
  public level: number;

  /**
   * The survivor's squad information.
   * Will be undefined if the survivor is not part of a squad
   */
  public squad?: STWSurvivorSquadData;

  /**
   * The survivor's portrait ID
   */
  public portrait?: string;

  /**
   * The survivor's max level bonus
   */
  public maxLevelBonus: number;

  /**
   * The survivor's personality
   */
  public personality: string;

  /**
   * The survivor's XP
   */
  public xp: number;

  /**
   * The survivor's equipped building's ID.
   * Seems to be unused by the game
   */
  public buildingSlotBuildingId?: string;

  /**
   * The survivor's set bonus
   */
  public setBonus: string;

  /**
   * Whether the survivor is marked as seen
   */
  public isSeen: boolean;

  /**
   * Whether the survivor is marked as favorite
   */
  public isFavorite: boolean;

  /**
   * @param client The main client
   * @param id The item ID
   * @param data The survivors's data
   */
  constructor(client: Client, id: string, data: STWProfileSurvivorData) {
    super(client, id, data);

    const parsedSurvivor = parseSTWSurvivorTemplateId(data.templateId);

    this.type = parsedSurvivor.type;
    this.name = parsedSurvivor.name;
    this.tier = parsedSurvivor.tier;
    this.rarity = parsedSurvivor.rarity;

    this.managerSynergy = data.attributes.managerSynergy;

    this.gender = data.attributes.gender === '1' ? 'male' : 'female';
    this.level = data.attributes.level;

    this.squad = data.attributes.squad_id !== '' ? {
      id: data.attributes.squad_id,
      name: data.attributes.squad_id.split('_')[3] as keyof STWSurvivorSquads,
      type: data.attributes.squad_id.split('_')[2] as STWSurvivorSquadType,
      slotIdx: data.attributes.squad_slot_idx,
    } : undefined;

    this.portrait = data.attributes.portrait;
    this.maxLevelBonus = data.attributes.max_level_bonus;
    this.personality = data.attributes.personality;
    this.xp = data.attributes.xp;

    this.buildingSlotBuildingId = data.attributes.building_slot_used !== -1 ? data.attributes.slotted_building_id : undefined;

    this.setBonus = data.attributes.set_bonus;
    this.isSeen = data.attributes.item_seen;
    this.isFavorite = data.attributes.favorite;
  }

  /**
   * Whether the survivor is a leader
   */
  public get isLeader() {
    return this.type === 'manager';
  }

  /**
   * The survivor's rarity value (number from 0-6).
   * Depends on the actual rarity and whether the survivor is a leader
   */
  public get rarityValue() {
    return calcSTWSurvivorRarity(this.rarity, this.isLeader);
  }

  /**
   * The survivor's EVO constant (number from 0-9.85).
   * Depends on the rarity and whether the survivor is a leader
   */
  public get EVOConstant() {
    return calcSTWEVOConstant(this.rarityValue, this.isLeader);
  }

  /**
   * The survivor's level constant (number from 0-1.645).
   * Depends on the rarity and whether the survivor is a leader
   */
  public get levelConstant() {
    return calcSTWLevelConstant(this.rarityValue, this.isLeader);
  }

  /**
   * The survivor's power level.
   * Depends on the tier, level, rarity value and whether the survivor is a leader
   */
  public get powerLevel() {
    return calcSTWSurvivorPowerLevel(this.rarityValue, this.isLeader, this.level, this.tier);
  }

  /**
   * The survivor's lead bonus.
   * Will return 0 if the survivor is not a leader or not part of a squad
   */
  public get leadBonus() {
    if (!this.managerSynergy || !this.squad) return 0;

    return calcSTWSurvivorLeadBonus(this.managerSynergy, this.squad.name, this.powerLevel);
  }

  /**
   * Calculates the survivor's bonus.
   * Depends on the leader's rarity and personality.
   * Returns 0 if the survivor is a leader
   */
  public calcSurvivorBonus(leader: STWSurvivor) {
    if (this.isLeader) return 0;
    if (!leader.isLeader) throw new Error('The leader survivor must be a leader');

    return calcSTWSurvivorBonus(leader.personality, leader.rarity, this.personality, this.powerLevel);
  }
}

export default STWSurvivor;

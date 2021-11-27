import Client from '../client/Client';
import STWItem from './STWItem';
import { parseSTWSurvivorTemplateId } from '../util/Util';
import {
  STWSurvivorSquadData, STWSurvivorType, STWSurvivorRarity,
  STWSurvivorSquads, STWSurvivorSquadType,
} from '../../resources/structs';
import { STWProfileSurvivorData } from '../../resources/httpResponses';

/**
 * Represents a Save The World profile's survivor
 */
class STWSurvivor extends STWItem {
  public type: STWSurvivorType;
  public name?: string;
  public tier: number;
  public rarity: STWSurvivorRarity;
  public managerSynergy?: string;
  public gender: string;
  public level: number;
  public squad?: STWSurvivorSquadData;
  public portrait?: string;
  public maxLevelBonus: number;
  public personality: string;
  public xp: number;
  public buildingSlotBuildingId?: string;
  public setBonus: string;
  public isSeen: boolean;
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
}

export default STWSurvivor;

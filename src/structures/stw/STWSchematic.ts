import { calcSTWNonSurvivorPowerLevel, parseSTWSchematicTemplateId } from '../../util/Util';
import STWItem from './STWItem';
import type { STWProfileSchematicData } from '../../../resources/httpResponses';
import type {
  STWItemRarity, STWItemTier,
  STWSchematicEvoType,
  STWSchematicMeleeSubType, STWSchematicRangedSubType, STWSchematicTrapSubType,
  STWSchematicType,
} from '../../../resources/structs';
import type Client from '../../Client';

/**
 * Represents a Save The World profile's schematic
 */
class STWSchematic extends STWItem {
  /**
   * The schematic's type (ranged, melee, or trap)
   */
  public type: STWSchematicType;

  /**
   * The schematic's subtype (specific type of ranged/melee weapon or trap)
   */
  public subType?: STWSchematicRangedSubType | STWSchematicMeleeSubType | STWSchematicTrapSubType;

  /**
   * The schematic's name
   */
  public name?: string;

  /**
   * The schematic's tier
   */
  public tier?: STWItemTier;

  /**
   * The schematic's evolution type
   */
  public evoType?: STWSchematicEvoType;

  /**
   * The schematic's rarity
   */
  public rarity?: STWItemRarity;

  /**
   * The schematic's level
   */
  public level: number;

  /**
   * The schematic's max level bonus
   */
  public maxLevelBonus: number;

  /**
   * The schematic's xp
   */
  public xp: number;

  /**
   * Whether the schematic is marked as seen
   */
  public isSeen: boolean;

  /**
   * Whether the schematic is marked as favorite
   */
  public isFavorite: boolean;

  /**
   * Whether the schematic is marked as refundable
   */
  public isRefundable: boolean;

  /**
   * The schematic's perks
   */
  public alterations: string[];

  /**
   * The original rarities of the schematic's perks, before any upgrades
   */
  public alterationBaseRarities: string[];

  constructor(client: Client, id: string, data: STWProfileSchematicData) {
    super(client, id, data);

    const parsedSchematic = parseSTWSchematicTemplateId(data.templateId);

    this.type = parsedSchematic.type;
    this.subType = parsedSchematic.subType;
    this.name = parsedSchematic.name;
    this.tier = parsedSchematic.tier;
    this.evoType = parsedSchematic.evoType;
    this.rarity = parsedSchematic.rarity;

    this.level = data.attributes.level;
    this.maxLevelBonus = data.attributes.max_level_bonus;
    this.xp = data.attributes.xp;

    this.isSeen = data.attributes.item_seen;
    this.isFavorite = data.attributes.favorite;
    this.isRefundable = data.attributes.refundable;

    this.alterations = data.attributes.alterations;
    this.alterationBaseRarities = data.attributes.alteration_base_rarities;
  }

  /**
   * The schematic's power level.
   * Depends on the tier, level, and rarity value
   */
  public get powerLevel() {
    if (!this.rarity || !this.tier) { return 1; }
    return calcSTWNonSurvivorPowerLevel(this.rarity, this.level, this.tier);
  }
}

export default STWSchematic;

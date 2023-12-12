import {
  calcSTWNonSurvivorPowerLevel, parseSTWHeroTemplateId,
} from '../../util/Util';
import STWItem from './STWItem';
import type { STWProfileHeroData } from '../../../resources/httpResponses';
import type { STWItemRarity, STWHeroType, STWItemTier } from '../../../resources/structs';
import type Client from '../../Client';

/**
 * Represents a Save The World profile's hero
 */
class STWHero extends STWItem {
  /**
   * The hero's type.
   */
  public type: STWHeroType;

  /**
   * The hero's name.
   */
  public name?: string;

  /**
   * The hero's tier
   */
  public tier: STWItemTier;

  /**
   * The hero's rarity
   */
  public rarity: STWItemRarity;

  /**
   * The hero's level
   */
  public level: number;

  /**
   * The hero's max level bonus
   */
  public maxLevelBonus: number;

  /**
   * The hero's XP
   */
  public xp: number;

  /**
   * Whether the hero is marked as seen
   */
  public isSeen: boolean;

  /**
   * Whether the hero is marked as favorite
   */
  public isFavorite: boolean;

  /**
   * Whether the hero is marked as refundable
   */
  public isRefundable: boolean;

  /**
   * @param client The main client
   * @param id The item ID
   * @param data The hero's data
   */
  constructor(client: Client, id: string, data: STWProfileHeroData) {
    super(client, id, data);

    const parsedHero = parseSTWHeroTemplateId(data.templateId);

    this.type = parsedHero.type;
    this.name = parsedHero.name;
    this.tier = parsedHero.tier;
    this.rarity = parsedHero.rarity;

    this.level = data.attributes.level;
    this.maxLevelBonus = data.attributes.max_level_bonus;
    this.xp = data.attributes.xp;

    this.isSeen = data.attributes.item_seen;
    this.isFavorite = data.attributes.favorite;
    this.isRefundable = data.attributes.refundable;
  }

  /**
   * The hero's power level.
   * Depends on the tier, level, and rarity value
   */
  public get powerLevel() {
    return calcSTWNonSurvivorPowerLevel(this.rarity, this.level, this.tier);
  }
}

export default STWHero;

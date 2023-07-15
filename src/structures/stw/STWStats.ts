import Base from '../../Base';
import type Client from '../../Client';
import type { STWProfileStatsData } from '../../../resources/httpResponses';
import type {
  STWStatsNodeCostsData, STWStatsBRLoadoutData, STWStatsSTWLoadoutData,
  STWStatsMissionAlertRedemptionData, STWStatsQuestData, STWStatsGameplayStatData,
  STWStatsClientSettingsData, STWStatsResearchLevelsData, STWStatsDailyRewardsData,
  STWStatsEventCurrencyData, STWStatsXPData,
} from '../../../resources/structs';

/**
 * Represents a Save The World profile's stats
 */
class STWStats extends Base {
  /**
   * The profile's node costs
   */
  public nodeCosts: STWStatsNodeCostsData;

  /**
   * The profile's Save The World loadout data
   */
  public stwLoadout: STWStatsSTWLoadoutData;

  /**
   * The profile's Battle Royale loadout data
   */
  public brLoadout: STWStatsBRLoadoutData;

  /**
   * The profile's mission alert redemption record
   */
  public missionAlertRedemptionRecord?: STWStatsMissionAlertRedemptionData[];

  /**
   * The profile's amount of rewards claimed post max level
   */
  public rewardsClaimedPostMaxLevel: number;

  /**
   * The profile's collection book max XP level
   */
  public collectionBookMaxXPLevel?: number;

  /**
   * Whether the profile has claimed the MFA reward
   */
  public mfaRewardClaimed: boolean;

  /**
   * The profile's quests data
   */
  public quests?: STWStatsQuestData;

  /**
   * The profile's amount of legacy research points spent
   */
  public legacyResearchPointsSpent: number;

  /**
   * The profile's gameplay stats
   */
  public gameplayStats: STWStatsGameplayStatData[];

  /**
   * The profile's unslot mtx spend
   */
  public unslotMtxSpend: number;

  /**
   * The profile's client settings
   */
  public clientSettings: STWStatsClientSettingsData;

  /**
   * The profile's research levels
   */
  public researchLevels?: STWStatsResearchLevelsData;

  /**
   * The profile's level (max is 310)
   */
  public level: number;

  /**
   * The profile's latent XP marker
   */
  public latentXpMarker: string;

  /**
   * The profile's event currency
   */
  public eventCurrency?: STWStatsEventCurrencyData;

  /**
   * The profile's inventory limit bonus
   */
  public inventoryLimitBonus: number;

  /**
   * The profile's amount of matches played
   */
  public matchesPlayed: number;

  /**
   * The profile's xp data
   */
  public xp: STWStatsXPData;

  /**
   * The profile's daily rewards data
   */
  public dailyRewards?: STWStatsDailyRewardsData;

  /**
   * The profile's amount of packs granted
   */
  public packsGranted: number;

  /**
   * @param client The main client
   * @param data The stats data
   */
  constructor(client: Client, data: STWProfileStatsData) {
    super(client);

    this.nodeCosts = data.node_costs;

    this.stwLoadout = {
      selectedHeroLoadout: data.selected_hero_loadout,
      modeLoadouts: data.mode_loadouts,
      activeLoadoutIndex: data.active_loadout_index,
    };

    this.brLoadout = {
      loadouts: data.loadouts,
      lastAppliedLoadout: data.last_applied_loadout,
      useRandomLoadout: data.use_random_loadout,
    };

    this.missionAlertRedemptionRecord = data.mission_alert_redemption_record.claimData?.map((d) => ({
      missionAlertId: d.missionAlertId,
      redemptionDateUtc: new Date(d.redemptionDateUtc),
      evictClaimDataAfterUtc: new Date(d.evictClaimDataAfterUtc),
    }));

    this.rewardsClaimedPostMaxLevel = data.rewards_claimed_post_max_level || 0;
    this.collectionBookMaxXPLevel = data.collection_book?.maxBookXpLevelAchieved;
    this.mfaRewardClaimed = data.mfa_reward_claimed;

    this.quests = data.quest_manager?.questPoolStats ? {
      dailyLoginInterval: new Date(data.quest_manager.dailyLoginInterval!),
      dailyQuestRerolls: data.quest_manager.dailyQuestRerolls!,
      poolStats: {
        stats: data.quest_manager.questPoolStats.poolStats.map((d) => ({
          poolName: d.poolName,
          nextRefresh: new Date(d.nextRefresh),
          rerollsRemaining: d.rerollsRemaining,
          questHistory: d.questHistory,
        })),
        dailyLoginInterval: new Date(data.quest_manager.questPoolStats.dailyLoginInterval!),
        lockouts: data.quest_manager.questPoolStats.poolLockouts?.poolLockouts || [],
      },
    } : undefined;

    this.legacyResearchPointsSpent = data.legacy_research_points_spent;
    this.gameplayStats = data.gameplay_stats;
    this.unslotMtxSpend = data.unslot_mtx_spend;
    this.clientSettings = data.client_settings;

    this.researchLevels = typeof data.research_levels?.fortitude === 'number' ? {
      fortitude: data.research_levels.fortitude!,
      resistance: data.research_levels.resistance!,
      technology: data.research_levels.technology!,
      offense: data.research_levels.offense!,
    } : undefined;

    this.level = data.level || 0;
    this.latentXpMarker = data.latent_xp_marker;
    this.eventCurrency = data.event_currency;
    this.inventoryLimitBonus = data.inventory_limit_bonus;
    this.matchesPlayed = data.matches_played;

    this.xp = {
      total: data.xp,
      overflow: data.xp_overflow,
      lost: data.xp_lost,
    };

    this.dailyRewards = data.daily_rewards?.lastClaimDate ? {
      nextDefaultReward: data.daily_rewards.nextDefaultReward!,
      totalDaysLoggedIn: data.daily_rewards.totalDaysLoggedIn!,
      lastClaimDate: new Date(data.daily_rewards.lastClaimDate),
      additionalSchedules: data.daily_rewards.additionalSchedules!,
    } : undefined;

    this.packsGranted = data.packs_granted;
  }

  /**
   * The profile's actual account level (ignoring the max level cap of 310)
   */
  get actualLevel() {
    return this.level + this.rewardsClaimedPostMaxLevel;
  }
}

export default STWStats;

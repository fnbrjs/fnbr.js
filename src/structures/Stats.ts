/* eslint-disable class-methods-use-this */
/* eslint-disable no-restricted-syntax */
import Client from '../client/Client';
import Base from '../client/Base';
import { StatsData, StatsPlaylistTypeData, StatsLevelData } from '../../resources/structs';
import User from './User';
import { createDefaultInputTypeStats, parseStatKey } from '../util/Util';
import { RawStatsData } from '../../resources/httpResponses';

/**
 * Represents a user's battle royale stats
 */
class Stats extends Base {
  /**
   * The stats' start time
   */
  public startTime: Date;

  /**
   * The stats' end time
   */
  public endTime: Date;

  /**
   * The user the stats belong to
   */
  public user: User;

  /**
   * The stats
   */
  public stats: StatsData;

  /**
   * The stats' level data
   */
  public levelData: StatsLevelData;

  /**
   * @param client The main client
   * @param data The stats' data
   */
  constructor(client: Client, data: RawStatsData, user: User) {
    super(client);

    this.user = user;
    this.startTime = new Date(data.startTime / 1000);
    this.endTime = new Date(data.endTime / 1000);

    this.levelData = {};

    this.stats = {
      all: createDefaultInputTypeStats(),
      keyboardmouse: createDefaultInputTypeStats(),
      gamepad: createDefaultInputTypeStats(),
      touch: createDefaultInputTypeStats(),
    };

    for (const key of Object.keys(data.stats)) {
      if (key.startsWith('br')) {
        const fields = key.split('_');
        fields.shift();

        const statKey = fields.shift()!;
        const inputType = fields.shift() as 'keyboardmouse' | 'gamepad' | 'touch';
        fields.shift();
        const playlistId = fields.join('_');

        const playlistType = typeof this.client.config.statsPlaylistTypeParser === 'function'
          ? this.client.config.statsPlaylistTypeParser(playlistId)
          : this.getPlaylistStatsType(playlistId);

        if (playlistType !== 'other') {
          const [parsedKey, parsedValue] = parseStatKey(statKey, data.stats[key]);

          const inputTypePlaylistStats = this.stats[inputType][playlistType];
          const inputTypeAllStats = this.stats[inputType].overall;
          const allPlaylistStats = this.stats.all[playlistType];
          const allAllStats = this.stats.all.overall;

          if (parsedKey === 'lastModified') {
            if (!inputTypePlaylistStats.lastModified || (parsedValue as Date).getTime() > inputTypePlaylistStats.lastModified.getTime()) {
              inputTypePlaylistStats.lastModified = (parsedValue as Date);
            }

            if (!inputTypeAllStats.lastModified || (parsedValue as Date).getTime() > inputTypeAllStats.lastModified.getTime()) {
              inputTypeAllStats.lastModified = (parsedValue as Date);
            }

            if (!allPlaylistStats.lastModified || (parsedValue as Date).getTime() > allPlaylistStats.lastModified.getTime()) {
              allPlaylistStats.lastModified = (parsedValue as Date);
            }

            if (!allAllStats.lastModified || (parsedValue as Date).getTime() > allAllStats.lastModified.getTime()) {
              allAllStats.lastModified = (parsedValue as Date);
            }
          } else {
            inputTypePlaylistStats[parsedKey] += parsedValue as number;
            if (playlistType !== 'ltm') inputTypeAllStats[parsedKey] += parsedValue as number;
            allPlaylistStats[parsedKey] += parsedValue as number;
            if (playlistType !== 'ltm') allAllStats[parsedKey] += parsedValue as number;
          }
        }
      } else if (key.includes('social_bp_level')) {
        this.levelData[key.split('_')[0]] = {
          level: Math.round(data.stats[key] / 100),
          progress: data.stats[key] % 100,
        };
      }
    }

    for (const inputTypes of Object.keys(this.stats)) {
      for (const playlistTypeStats of Object.values(this.stats[inputTypes as keyof StatsData]) as StatsPlaylistTypeData[]) {
        playlistTypeStats.deaths = playlistTypeStats.matches - playlistTypeStats.wins;
        playlistTypeStats.kd = playlistTypeStats.kills / playlistTypeStats.deaths;
        playlistTypeStats.killsPerMin = playlistTypeStats.kills / playlistTypeStats.minutesPlayed;
        playlistTypeStats.killsPerMatch = playlistTypeStats.kills / playlistTypeStats.matches;
        playlistTypeStats.scorePerMin = playlistTypeStats.score / playlistTypeStats.minutesPlayed;
        playlistTypeStats.scorePerMatch = playlistTypeStats.score / playlistTypeStats.matches;
        playlistTypeStats.winRate = playlistTypeStats.wins / playlistTypeStats.matches;
      }
    }
  }

  /**
   * Returns the playlist stats type by the playlist id
   * @param playlistID The playlist ID
   */
  private getPlaylistStatsType(playlistID: string): 'other' | 'solo' | 'duo' | 'squad' | 'ltm' {
    const playlist = playlistID.toLowerCase().replace('playlist_', '');

    if (['creative', 'respawn', '16'].some((s) => playlist.includes(s))) return 'other';

    if (!['default', 'classic', 'showdown', 'vamp', 'unvaulted', 'toss', 'fill', 'heavy', 'tank', 'melt'].some((s) => playlist.includes(s))) return 'ltm';

    if (playlist.includes('solo')) return 'solo';
    if (playlist.includes('duo')) return 'duo';
    if (playlist.includes('trio')) return 'squad';
    if (playlist.includes('squad')) return 'squad';

    return 'other';
  }
}

export default Stats;

/* eslint-disable no-restricted-syntax */
import Base from '../Base';
import type User from './user/User';
import type Client from '../Client';
import type { ArenaDivisionData } from '../../resources/structs';

/**
 * Represents a user's event tokens
 */
class EventTokens extends Base {
  /**
   * The user the event tokens belong to
   */
  public user: User;

  /**
   * The raw event tokens
   */
  public tokens: string[];

  /**
   * The user's arena division data
   */
  public arenaDivisionData: ArenaDivisionData;

  /**
   * The user's geo identity
   */
  public geoIdentity?: string;

  /**
   * @param client The main client
   * @param data The avatar's data
   * @param user The user this avatar belongs to
   */
  constructor(client: Client, data: string[], user: User) {
    super(client);

    this.tokens = data;
    this.user = user;

    this.arenaDivisionData = {};
    this.geoIdentity = undefined;

    for (const token of this.tokens) {
      const type = token.split('_')[0];

      switch (type) {
        case 'ARENA': {
          let [, season, division] = token.split('_');

          if (!division) {
            division = season;
            season = 'S9';
          }

          const divisionNumber = parseInt(division.replace('Division', ''), 10);

          if (!this.arenaDivisionData[season.toLowerCase()] || this.arenaDivisionData[season.toLowerCase()] < divisionNumber) {
            this.arenaDivisionData[season.toLowerCase()] = divisionNumber;
          }
        } break;
        case 'GroupIdentity':
          [,, this.geoIdentity] = token.split('_');
          break;
      }
    }
  }
}

export default EventTokens;

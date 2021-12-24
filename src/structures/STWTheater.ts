import Client from '../client/Client';
import { STWTheaterData, STWTheaterLocaleData } from '../../resources/httpResponses';
import Base from '../client/Base';

/**
 * Represents a Save The World theater
 */
class STWTheater extends Base {
  /**
   * The theater's unique ID
   */
  public id: string;

  /**
   * The theater's display name
   */
  public displayName: string;

  /**
   * The theater's description
   */
  public description: string;

  /**
   * The theater's slot
   */
  public slot: number;

  /**
   * Whether the theater is a test theater
   */
  public isTestTheater: boolean;

  /**
   * Whether the theater should be hidden like a test theater
   */
  public hideLikeTestTheater: boolean;

  /**
   * The theater's required event flag
   */
  public requiredEventFlag: string;

  /**
   * The theater's mission reward named weights row name
   */
  public missionRewardNamedWeightsRowName: string;

  /**
   * @param client The main client
   * @param data The profile data
   * @param userData The user data
   */
  constructor(client: Client, data: STWTheaterData, language: keyof STWTheaterLocaleData) {
    super(client);

    this.id = data.uniqueId;
    this.displayName = data.displayName[language];
    this.description = data.description[language];
    this.slot = data.theaterSlot;
    this.isTestTheater = data.bIsTestTheater;
    this.hideLikeTestTheater = data.bHideLikeTestTheater;
    this.requiredEventFlag = data.requiredEventFlag;
    this.missionRewardNamedWeightsRowName = data.missionRewardNamedWeightsRowName;
  }
}

export default STWTheater;

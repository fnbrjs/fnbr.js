/**
 * Represents an error thrown because a user set their stats to private
 */
class StatsPrivacyError extends Error {
  /**
   * The user who set their stats to private
   */
  public user: string;

  /**
   * @param user The user who set their stats to private
   */
  constructor(user: string) {
    super();
    this.name = 'StatsPrivacyError';
    this.message = `The user "${user}" set their stats to private`;

    this.user = user;
  }
}

export default StatsPrivacyError;

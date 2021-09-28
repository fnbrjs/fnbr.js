/**
 * Represets an error thrown because the friendship invitee does disabled friendship requests
 */
class InviteeFriendshipSettingsError extends Error {
  /**
   * The query which resulted in this error
   */
  public query: string;

  /**
   * @param query The query which resulted in this error
   */
  constructor(query: string) {
    super();
    this.name = 'InviteeFriendshipSettingsError';
    this.message = `The user ${query} disabled friendship requests`;

    this.query = query;
  }
}

export default InviteeFriendshipSettingsError;

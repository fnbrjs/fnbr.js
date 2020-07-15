/**
 * A party
 */
class Party {
  /**
   * @param {Object} client main client
   * @param {Object} data party data
   */
  constructor(client, data) {
    Object.defineProperty(this, 'Client', { value: client });
    Object.defineProperty(this, 'data', { value: data });


    if (!this.id) throw new Error('Cannot initialize party without an id');
  }

  /**
   * Create a party
   * @param {Object} client the main client
   */
  static async Create(client, config) {
    const partyConfig = {...client.config.partyConfig, ...config };

  }
}

module.exports = Party;

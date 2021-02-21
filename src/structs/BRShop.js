const BRShopOffer = require('./BRShopOffer');

/**
 * Represents a fortnite battle royale shop
 */
class BRShop {
  /**
   * @param {Client} client The main client
   * @param {Object} data The shop data
   */
  constructor(client, data) {
    Object.defineProperty(this, 'Client', { value: client });

    /**
     * The daily offers
     * @type {BRShopOffer}
     */
    this.daily = data.find((s) => s.name === 'BRDailyStorefront').catalogEntries.map((e) => new BRShopOffer(this, e));

    /**
     * The featured (weekly) offers
     * @type {BRShopOffer}
     */
    this.featured = data.find((s) => s.name === 'BRWeeklyStorefront').catalogEntries.map((e) => new BRShopOffer(this, e));

    /**
     * The special daily offers
     * @type {BRShopOffer}
     */
    this.specialDaily = data.find((s) => s.name === 'BRSpecialDaily').catalogEntries.map((e) => new BRShopOffer(this, e));

    /**
     * The special featured (weekly) offers
     * @type {BRShopOffer}
     */
    this.specialFeatured = data.find((s) => s.name === 'BRSpecialFeatured').catalogEntries.map((e) => new BRShopOffer(this, e));
  }
}

module.exports = BRShop;

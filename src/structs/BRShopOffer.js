/* eslint-disable max-len */
/**
 * Represents a fortnite battle royale shop offer
 */
class BRShopOffer {
  /**
   * @param {BRShop} shop The shop
   * @param {Object} data The offer's data
   */
  constructor(shop, data) {
    Object.defineProperty(this, 'Shop', { value: shop });

    /**
     * The offer's id
     * @type {string}
     */
    this.id = data.offerId;

    /**
     * The offer's dev name
     * @type {string}
     */
    this.devName = data.devName;

    /**
     * The offer's fulfillment ids
     * @type {Array}
     */
    this.fulfillmentIds = data.fulfillmentIds;

    /**
     * The offer's daily limit
     * @type {number}
     */
    this.dailyLimit = data.dailyLimit;

    /**
     * The offer's weekly limit
     * @type {number}
     */
    this.weeklyLimit = data.weeklyLimit;

    /**
     * The offer's monthly limit
     * @type {number}
     */
    this.monthlyLimit = data.monthlyLimit;

    /**
     * The offer's categories
     * @type {Array}
     */
    this.categories = data.categories;

    /**
     * The offer's prices
     * @type {Array}
     */
    this.prices = data.prices;

    /**
     * The offer's meta
     * @type {Object}
     */
    this.meta = data.meta;

    /**
     * The offer's match filter
     * @type {string}
     */
    this.matchFilter = data.matchFilter;

    /**
     * The offer's filter weight
     * @type {number}
     */
    this.filterWeight = data.filterWeight;

    /**
     * The offer's app store id
     * @type {Array}
     */
    this.appStoreId = data.appStoreId;

    /**
     * The offer's requirements
     * @type {Array}
     */
    this.requirements = data.requirements;

    /**
     * The offer's type
     * @type {string}
     */
    this.type = data.offerType;

    /**
     * The offer's gift info
     * @type {Object}
     */
    this.giftInfo = data.giftInfo;

    /**
     * Whether the offer's is refundable
     * @type {boolean}
     */
    this.refundable = data.refundable;

    /**
     * The offer's meta info
     * @type {Array}
     */
    this.metaInfo = data.metaInfo;

    /**
     * The offer's display asset path
     * @type {string}
     */
    this.displayAssetPath = data.displayAssetPath;

    /**
     * The offer's item grants
     * @type {Array}
     */
    this.itemGrants = data.itemGrants;

    /**
     * The offer's additional grants
     * @type {Array}
     */
    this.additionalGrants = data.additionalGrants;

    /**
     * The offer's sort priority
     * @type {number}
     */
    this.sortPriority = data.sortPriority;

    /**
     * The offer's catalog group priority
     * @type {number}
     */
    this.catalogGroupPriority = data.catalogGroupPriority;
  }
}

module.exports = BRShopOffer;

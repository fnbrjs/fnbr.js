/* eslint-disable max-len */
const { Language } = require('../../enums');

/**
 * Represents a fortnite news message
 */
class News {
  /**
   * @param {Client} client The main client
   * @param {Object} data The news data
   */
  constructor(client, data) {
    Object.defineProperty(this, 'Client', { value: client });

    /**
     * The news message id
     * @type {string}
     */
    this.id = data.id;

    /**
     * The news message title
     * @type {string}
     */
    this.title = data.title;

    /**
     * The news message body
     * @type {string}
     */
    this.body = data.body;

    /**
     * The news message button text override
     * @type {string}
     */
    this.buttonTextOverride = data.buttonTextOverride;

    /**
     * The news message tab title override
     * @type {string}
     */
    this.tabTitleOverride = data.tabTitleOverride;

    /**
     * Whether the news message is hidden
     * @type {boolean}
     */
    this.hidden = data.hidden;

    /**
     * The news message entry type
     * @type {string}
     */
    this.entryType = data.entryType;

    /**
     * The news message sorting priority
     * @type {number}
     */
    this.sortingPriority = data.sortingPriority;

    /**
     * Whether the news message contains a spotlight
     * @type {boolean}
     */
    this.spotlight = data.spotlight;

    /**
     * The news message image urls
     * @type {Object<string,string>}
     */
    this.images = {
      image: data.image,
      tileImage: data.tileImage,
    };

    /**
     * The news message video data
     * @type {Object<string,string|boolean>}
     */
    this.video = {
      id: data.videoUID,
      name: data.videoVideoString,
      mute: data.videoMute,
      loop: data.videoLoop,
      streamingEnabled: data.videoStreamingEnabled,
      autoplay: data.videoAutoplay,
      fullscreen: data.videoFullscreen,
    };

    /**
     * The news message offer data
     * @type {Object<string,string>}
     */
    this.offer = {
      id: data.offerId,
      action: data.offerAction,
    };
  }

  /**
   * Download the news video (if available)
   * @param {Language} language The video language
   * @param {string} resolution The video resolution (1920x1080, 1152x656, 1280x720, 864x480, 640x368, 512x288)
   * @returns {Promise<Buffer>} The m3u8 video file as a buffer
   * @example
   * fs.writeFile('./video.m3u8', await news.downloadVideo('kDrsgRdgDiQrNOSu', Enums.Language.ENGLISH, '1920x1080'));
   * in cmd: ffmpeg -protocol_whitelist https,file,tcp,tls -i ./video.m3u8 ./newsVid.mp4
   */
  async downloadVideo(language = Language.ENGLISH, resolution = '1920x1080') {
    if (!this.video.id) throw new Error('Cannot download news video: News message doesn\'t contain a video');
    return this.Client.getBlurlVideo(this.video.id, language, resolution);
  }
}

module.exports = News;

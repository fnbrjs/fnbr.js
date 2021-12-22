import path from 'path';
import Base from '../client/Base';
import Client from '../client/Client';
import { ImageData } from '../../resources/structs';

/**
 * Represents an image
 */
class Image extends Base {
  /**
   * The image's url
   */
  public url: string;

  /**
   * The image's width
   */
  public width?: number;

  /**
   * The image's height
   */
  public height?: number;

  /**
   * The image's file extension (usually 'png' or 'jpeg' / 'jpg')
   */
  public fileExtension: string;

  /**
   * @param client The main client
   * @param data The image's data
   */
  constructor(client: Client, data: ImageData) {
    super(client);

    this.url = data.url;
    this.width = data.width;
    this.height = data.height;
    this.fileExtension = path.extname(this.url);
  }

  /**
   * Downloads the image
   * @throws {AxiosError}
   */
  public async download(): Promise<Buffer> {
    const res = await this.client.http.send('GET', this.url, undefined, undefined, undefined, 'arraybuffer');
    if (res.error) throw res.error;

    return res.response.data;
  }

  public toString() {
    return this.url;
  }
}

export default Image;

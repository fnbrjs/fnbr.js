export interface StompMessageHeaderData {
  [key: string]: string;
}

export interface StompMessageData {
  command: string;
  headers: StompMessageHeaderData;
  body?: string;
}

class STOMPMessage {
  public command: string;
  public headers: StompMessageHeaderData;
  public body?: string;
  constructor(data: StompMessageData) {
    this.command = data.command;
    this.headers = data.headers;
    this.body = data.body;
  }

  public toString(): string {
    return `${this.command}\n${Object.entries(this.headers).map(([k, v]) => `${k}:${v}`).join('\n')}\n\n${this.body || ''}\x00`;
  }

  public static fromString(message: string): STOMPMessage {
    const [header, body] = message.split('\n\n');
    const [command, ...rawHeaders] = header.split('\n');

    const headers: StompMessageHeaderData = {};
    rawHeaders.forEach((h) => {
      const [key, ...value] = h.split(':');
      headers[key] = value.join(':');
    });

    return new STOMPMessage({
      command,
      headers,
      // eslint-disable-next-line no-control-regex
      body: body.replace(/\x00$/, ''),
    });
  }
}

export default STOMPMessage;

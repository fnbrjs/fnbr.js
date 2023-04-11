/* eslint-disable no-restricted-syntax */
import readline from 'readline';
import zlib from 'zlib';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import { STWLeadSynergy } from '../../enums/Enums';
import BinaryWriter from './BinaryWriter';
import PowerLevelCurves from '../../resources/PowerLevelCurves';
import type {
  Schema, ReplayData, ReplayDataChunk, ReplayEvent,
  STWItemRarity, STWSurvivorType, STWSurvivorSquads,
  STWHeroType,
  StatsPlaylistTypeData,
  STWItemTier,
  STWSchematicType,
  STWSchematicEvoType,
  STWSchematicSubType,
  AuthStringResolveable,
  DeviceAuthResolveable,
} from '../../resources/structs';

const defaultCharacters = [
  'CID_556_Athena_Commando_F_RebirthDefaultA',
  'CID_557_Athena_Commando_F_RebirthDefaultB',
  'CID_558_Athena_Commando_F_RebirthDefaultC',
  'CID_559_Athena_Commando_F_RebirthDefaultD',
  'CID_560_Athena_Commando_M_RebirthDefaultA',
  'CID_561_Athena_Commando_M_RebirthDefaultB',
  'CID_562_Athena_Commando_M_RebirthDefaultC',
  'CID_563_Athena_Commando_M_RebirthDefaultD',
];

export const consoleQuestion = (question: string) => new Promise<string>((resolve) => {
  const itf = readline.createInterface(process.stdin, process.stdout);
  itf.question(question, (answer: string) => {
    itf.close();
    resolve(answer);
  });
});

export const makeCamelCase = (obj: { [key: string]: any }): any => {
  const returnObj: { [key: string]: any } = {};
  Object.keys(obj).forEach((k) => {
    returnObj[k.split('_').map((s, i) => (i > 0 ? `${s.charAt(0).toUpperCase()}${s.slice(1)}` : s)).join('')] = obj[k];
  });
  return returnObj;
};

export const makeSnakeCase = (obj: { [key: string]: any }): any => {
  const returnObj: { [key: string]: any } = {};
  Object.keys(obj).forEach((k) => {
    returnObj[k.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)] = obj[k];
  });
  return returnObj;
};

export const getRandomDefaultCharacter = () => defaultCharacters[Math.floor(Math.random() * defaultCharacters.length)];

export const createPartyInvitation = (clientUserId: string, pingerId: string, data: any) => {
  const member = data.members.find((m: any) => m.account_id === pingerId);

  const partyMeta = data.meta;
  const memberMeta = member.meta;
  const meta: Schema = {
    'urn:epic:conn:type_s': 'game',
    'urn:epic:cfg:build-id_s': partyMeta['urn:epic:cfg:build-id_s'],
    'urn:epic:invite:platformdata_s': '',
  };

  if (memberMeta.Platform_j) {
    meta.Platform_j = JSON.parse(memberMeta.Platform_j).Platform.platformStr;
  }

  if (memberMeta['urn:epic:member:dn_s']) meta['urn:epic:member:dn_s'] = memberMeta['urn:epic:member:dn_s'];

  return {
    party_id: data.id,
    sent_by: pingerId,
    sent_to: clientUserId,
    sent_at: data.sent,
    updated_at: data.sent,
    expires_at: data.expies_at,
    status: 'SENT',
    meta,
  };
};

export const parseBlurlStream = (stream: Buffer) => new Promise<any>((res) => {
  zlib.inflate(stream.slice(8), (err, buffer) => {
    const data = JSON.parse(buffer.toString());
    res(data);
  });
});

const parseM3U8FileLine = (line: string): [string, any] => {
  const [key, value] = line.replace(/^#EXT-X-/, '').split(/:(.+)/);

  let output: any;

  if (value.includes(',')) {
    output = {};

    let store = '';
    let isString = false;
    for (const char of value.split('')) {
      if (char === '"') {
        isString = !isString;
      } else if (char === ',' && !isString) {
        const [vK, vV] = store.split(/=(.+)/);
        output[vK] = vV.replace(/(^"|"$)/g, '');
        store = '';
      } else {
        store += char;
      }
    }
  } else {
    output = value;
  }

  return [key, output];
};

export const parseM3U8File = (data: string) => {
  const output: any = {
    streams: [],
  };

  let streamInf;
  for (const line of data.split(/\n/).slice(1)) {
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      [, streamInf] = parseM3U8FileLine(line);
    } else if (line.startsWith('#EXT-X-')) {
      const [key, value] = parseM3U8FileLine(line);
      output[key] = value;
    } else if (!line.startsWith('#') && streamInf && line.length > 0) {
      output.streams.push({
        data: streamInf,
        url: line,
      });

      streamInf = undefined;
    }
  }

  return output;
};

const buildReplayMeta = (replay: BinaryWriter, replayData: ReplayData) => {
  replay
    .writeUInt32(480436863)
    .writeUInt32(6)
    .writeUInt32(replayData.LengthInMS)
    .writeUInt32(replayData.NetworkVersion)
    .writeUInt32(replayData.Changelist)
    .writeString(replayData.FriendlyName.padEnd(256), 'utf16le')
    .writeBool(replayData.bIsLive)
    .writeUInt64((BigInt(new Date(replayData.Timestamp).getTime()) * BigInt('10000')) + BigInt('621355968000000000'))
    .writeBool(replayData.bCompressed)
    .writeBool(false)
    .writeUInt32(0);
};

type ReplayChunkData = Partial<ReplayEvent & ReplayDataChunk>;

interface ReplayChunk extends ReplayChunkData {
  chunkType: number;
  data: Buffer;
}

const buildChunks = (replay: BinaryWriter, replayData: ReplayData) => {
  const chunks: ReplayChunk[] = [{
    chunkType: 0,
    data: replayData.Header,
  },
  ...replayData.DataChunks?.map((c) => ({
    ...c,
    chunkType: 1,
  })) || [],
  ...replayData.Checkpoints?.map((c) => ({
    ...c,
    chunkType: 2,
  })) || [],
  ...replayData.Events?.map((c) => ({
    ...c,
    chunkType: 3,
  })) || []];

  for (const chunk of chunks) {
    replay.writeUInt32(chunk.chunkType);

    const chunkSizeOffset = replay.offset;
    replay.writeInt32(0);

    switch (chunk.chunkType) {
      case 0:
        replay.writeBytes(chunk.data);
        break;
      case 1:
        replay
          .writeUInt32(chunk.Time1!)
          .writeUInt32(chunk.Time2!)
          .writeUInt32(chunk.data.length)
          .writeInt32(chunk.SizeInBytes!)
          .writeBytes(chunk.data);
        break;
      case 2:
        replay
          .writeString(chunk.Id!)
          .writeString(chunk.Group!)
          .writeString(chunk.Metadata || '')
          .writeUInt32(chunk.Time1!)
          .writeUInt32(chunk.Time2!)
          .writeUInt32(chunk.data.length)
          .writeBytes(chunk.data);
        break;
      case 3:
        replay
          .writeString(chunk.Id!)
          .writeString(chunk.Group!)
          .writeString(chunk.Metadata || '')
          .writeUInt32(chunk.Time1!)
          .writeUInt32(chunk.Time2!)
          .writeUInt32(chunk.data.length)
          .writeBytes(chunk.data);
        break;
    }

    const chunkSize = replay.offset - (chunkSizeOffset + 4);

    const savedOffset = replay.offset;
    replay
      .goto(chunkSizeOffset)
      .writeInt32(chunkSize)
      .goto(savedOffset);
  }
};

export const buildReplay = (replayData: ReplayData, addStats: boolean) => {
  if (replayData.Events && addStats) {
    replayData.Events.push({
      Id: `${replayData.ReplayName}_${crypto.randomBytes(16).toString('hex')}`,
      Group: 'AthenaReplayBrowserEvents',
      Metadata: 'AthenaMatchStats',
      data: Buffer.alloc(48),
      Time1: replayData.LengthInMS - 15000,
      Time2: replayData.LengthInMS - 15000,
    });

    replayData.Events.push({
      Id: `${replayData.ReplayName}_${crypto.randomBytes(16).toString('hex')}`,
      Group: 'AthenaReplayBrowserEvents',
      Metadata: 'AthenaMatchTeamStats',
      data: Buffer.alloc(12),
      Time1: replayData.LengthInMS - 15000,
      Time2: replayData.LengthInMS - 15000,
    });
  }

  const finalReplayByteLength = 562 // meta
    + 8 + replayData.Header.length // header
    + (replayData.DataChunks?.map((c) => 8 + 16 + c.data.length).reduce((acc, cur) => acc + cur) || 0) // datachunks
    + (replayData.Events?.map((e) => 8 + 12 + e.Id.length + 5 + e.Group.length + 5
      + (e.Metadata ? e.Metadata.length + 5 : 5) + e.data.length).reduce((acc, cur) => acc + cur) || 0) // events
    + (replayData.Checkpoints?.map((c) => 8 + 12 + c.Id.length + 5 + c.Group.length + 5
      + (c.Metadata ? c.Metadata.length + 5 : 5) + c.data.length).reduce((acc, cur) => acc + cur) || 0); // checkpoints

  const replay = new BinaryWriter(Buffer.alloc(finalReplayByteLength));

  buildReplayMeta(replay, replayData);
  buildChunks(replay, replayData);

  return replay.buffer;
};

export const parseSTWSurvivorTemplateId = (templateId: string) => {
  const id = templateId.split(':')[1];
  const fields = id.split('_');

  let type: STWSurvivorType;
  const rawType = fields.shift();
  if (rawType === 'worker') type = 'special';
  else if (rawType?.includes('manager')) type = 'manager';
  else type = 'basic';

  const tier = parseInt(fields.pop()!.slice(1), 10) as STWItemTier;
  const rarity = (type === 'manager' ? fields.shift() : fields.pop()) as STWItemRarity;
  const name = fields[0] ? fields.join('_') : undefined;

  return {
    type,
    tier,
    rarity,
    name,
  };
};

export const calcSTWSurvivorPowerLevel = (rarity: STWItemRarity, isLeader: boolean, level: number, tier: STWItemTier) => {
  /**
   * We use Exclude<> here because mythic lead survivors actually have SR (legendary) rarity,
   * and thus there are no rating curves for UR managers.
   */
  const key = isLeader
    ? `manager_${rarity as Exclude<STWItemRarity, 'ur'>}_t0${tier}` as const
    : `default_${rarity}_t0${tier}` as const;
  return PowerLevelCurves.survivorItemRating[key].eval(level);
};

export const calcSTWSurvivorBonus = (
  leaderPersonality: string,
  leaderRarity: string,
  survivorPersonality: string,
  survivorPowerLevel: number,
) => {
  if (survivorPersonality === leaderPersonality) {
    if (leaderRarity === 'sr') return 8;
    if (leaderRarity === 'vr') return 5;
    if (leaderRarity === 'r') return 4;
    if (leaderRarity === 'uc') return 3;
    if (leaderRarity === 'c') return 2;
  } else if (leaderRarity === 'sr') {
    if (survivorPowerLevel <= 2) return 0;
    return -2;
  }

  return 0;
};

export const calcSTWSurvivorLeadBonus = (managerSynergy: string, squadName: keyof STWSurvivorSquads, powerLevel: number) => {
  const leaderMatch = managerSynergy!.split('.')[2];

  if (STWLeadSynergy[squadName] === leaderMatch) {
    return powerLevel;
  }

  return 0;
};

export const parseSTWHeroTemplateId = (templateId: string) => {
  const id = templateId.split(':')[1];
  const fields = id.split('_');

  fields.shift();
  const type = fields.shift() as STWHeroType;

  const tier = parseInt(fields.pop()!.slice(1), 10) as STWItemTier;
  const rarity = fields.pop() as STWItemRarity;
  const name = fields[0] ? fields.join('_') : undefined;

  return {
    type,
    tier,
    rarity,
    name,
  };
};

export const calcSTWNonSurvivorPowerLevel = (rarity: STWItemRarity, level: number, tier: STWItemTier) => (
  PowerLevelCurves.baseItemRating[`default_${rarity}_t0${tier}`].eval(level)
);

export function parseSTWSchematicTemplateId(templateId: string): {
  type: STWSchematicType;
  subType?: STWSchematicSubType;
  tier?: STWItemTier;
  evoType?: STWSchematicEvoType;
  rarity?: STWItemRarity;
  name?: string;
} {
  const id = templateId.split(':')[1];
  const fields = id.split('_');

  let type: STWSchematicType;
  let subType: STWSchematicSubType | undefined;

  let firstField = fields.shift();

  if (firstField !== 'sid') {
    // probably ammo or something weird
    fields.unshift(firstField!);
    return {
      type: 'other',
      subType: undefined,
      tier: undefined,
      evoType: undefined,
      rarity: undefined,
      name: fields[0] ? fields.join('_') : undefined,
    };
  }

  firstField = fields.shift();
  let nextField: string | undefined;
  let i: number;

  switch (firstField) {
    case 'edged':
      type = 'melee';
      // look for "axe", "scythe", or "sword", which might occur later in the name
      i = fields.findIndex((f) => f === 'axe' || f === 'scythe' || f === 'sword');
      if (i >= 0) {
        subType = `edged_${fields[i] as 'axe' | 'scythe' | 'sword'}`;
        fields.splice(i, 1);
      } else {
        subType = undefined;
      }
      break;
    case 'blunt':
      type = 'melee';
      // if the next field is "hammer", then the full type is "blunt_hammer", otherwise "blunt"
      nextField = fields.shift();
      if (nextField === 'hammer') {
        subType = 'blunt_hammer';
      } else {
        if (nextField !== undefined) {
          fields.unshift(nextField);
        }
        subType = 'blunt';
      }
      break;
    case 'piercing':
      type = 'melee';
      // "piercing" should always be followed by "spear", because spear is the only piercing weapon type
      nextField = fields.shift();
      if (nextField === 'spear') {
        subType = 'piercing_spear';
      } else {
        if (nextField !== undefined) {
          fields.unshift(nextField);
        }
        subType = undefined;
      }
      break;
    case 'ceiling':
    case 'floor':
    case 'wall':
      type = 'trap';
      subType = firstField;
      break;
    case 'explosive':
    case 'launcher':
      // "launcher" and "explosive" are used interchangeably to refer to the same subtype,
      // but only some weapons of that subtype use "explosive" ammo, so we settle on "launcher"
      type = 'ranged';
      subType = 'launcher';
      break;
    case 'assault':
      type = 'ranged';
      // some weapons that were originally ARs were recategorized as SMGs when that subtype
      // was added, and now they have both "assault" and "smg" in the name
      i = fields.findIndex((f) => f === 'smg');
      if (i >= 0) {
        subType = 'smg';
        fields.splice(i, 1);
        fields.unshift(firstField);
      } else {
        subType = 'assault';
      }
      break;
    case 'pistol':
    case 'shotgun':
    case 'smg':
    case 'sniper':
      type = 'ranged';
      subType = firstField;
      break;
    default:
      // the name doesn't fit any known pattern, so this might be a new type of schematic.
      // in the meantimwe, we still need to represent it somehow.
      type = 'other';
      subType = firstField as STWSchematicSubType;
      break;
  }

  const tier = parseInt(fields.pop()!.slice(1), 10) as STWItemTier;
  const evoType = type !== 'trap' ? fields.pop() as STWSchematicEvoType : undefined;
  const rarity = fields.pop() as STWItemRarity;
  const name = fields[0] ? fields.join('_') : undefined;

  return {
    type,
    subType,
    tier,
    evoType,
    rarity,
    name,
  };
}

const defaultStats = {
  score: 0,
  scorePerMin: 0,
  scorePerMatch: 0,
  wins: 0,
  top3: 0,
  top5: 0,
  top6: 0,
  top10: 0,
  top12: 0,
  top25: 0,
  kills: 0,
  killsPerMin: 0,
  killsPerMatch: 0,
  deaths: 0,
  kd: 0,
  matches: 0,
  winRate: 0,
  minutesPlayed: 0,
  playersOutlived: 0,
  lastModified: undefined,
};

export const createDefaultInputTypeStats = () => ({
  overall: { ...defaultStats },
  solo: { ...defaultStats },
  duo: { ...defaultStats },
  squad: { ...defaultStats },
  ltm: { ...defaultStats },
});

export const parseStatKey = (key: string, value: number): [keyof StatsPlaylistTypeData, (number | Date)] => {
  switch (key) {
    case 'lastmodified':
      return ['lastModified', new Date(value * 1000)];
    case 'placetop25':
      return ['top25', value];
    case 'placetop12':
      return ['top12', value];
    case 'placetop10':
      return ['top10', value];
    case 'placetop6':
      return ['top6', value];
    case 'placetop5':
      return ['top5', value];
    case 'placetop3':
      return ['top3', value];
    case 'placetop1':
      return ['wins', value];
    case 'playersoutlived':
      return ['playersOutlived', value];
    case 'minutesplayed':
      return ['minutesPlayed', value];
    case 'matchesplayed':
      return ['matches', value];
    default:
      return [key as keyof StatsPlaylistTypeData, value];
  }
};

export const resolveAuthString = async (str: AuthStringResolveable) => {
  switch (typeof str) {
    case 'function':
      return str();
    case 'string':
      if (str.length === 32 || str.startsWith('eg1')) {
        return str;
      }

      return fs.readFile(str, 'utf8');
    default:
      throw new TypeError(`The type "${typeof str}" does not resolve to a valid auth string`);
  }
};

export const resolveAuthObject = async (obj: DeviceAuthResolveable) => {
  switch (typeof obj) {
    case 'function':
      return obj();
    case 'string':
      return JSON.parse(await fs.readFile(obj, 'utf8'));
    case 'object':
      return obj;
    default:
      throw new TypeError(`The type "${typeof obj}" does not resolve to a valid auth object`);
  }
};

export const chunk = <T extends any>(array: T[], maxSize: number): T[][] => {
  const chunkedArray: T[][] = [];

  for (let i = 0; i < array.length; i += maxSize) {
    chunkedArray.push(array.slice(i, i + maxSize));
  }

  return chunkedArray;
};

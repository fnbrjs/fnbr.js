/* eslint-disable max-len */
/**
 * Represents the privacy of a party:
 * * `PUBLIC` - anyone can join the party
 * * `FRIENDS_ALLOW_FRIENDS_OF_FRIENDS` - the client's friends and their friends can join the party
 * * `FRIENDS` - the client's friends can join the party
 * * `PRIVATE_ALLOW_FRIENDS_OF_FRIENDS` - the client's friends and their friends can join the party only with an invite
 * * `PRIVATE` - party is not joinable without an invite from the leader
 * @typedef {string} PartyPrivacy
 */
module.exports.PartyPrivacy = Object.freeze({
  PUBLIC: {
    partyType: 'Public',
    inviteRestriction: 'AnyMember',
    onlyLeaderFriendsCanJoin: false,
    presencePermission: 'Anyone',
    invitePermission: 'Anyone',
    acceptingMembers: true,
  },
  FRIENDS_ALLOW_FRIENDS_OF_FRIENDS: {
    partyType: 'FriendsOnly',
    inviteRestriction: 'AnyMember',
    onlyLeaderFriendsCanJoin: false,
    presencePermission: 'Anyone',
    invitePermission: 'AnyMember',
    acceptingMembers: true,
  },
  FRIENDS: {
    partyType: 'FriendsOnly',
    inviteRestriction: 'LeaderOnly',
    onlyLeaderFriendsCanJoin: true,
    presencePermission: 'Leader',
    invitePermission: 'Leader',
    acceptingMembers: false,
  },
  PRIVATE_ALLOW_FRIENDS_OF_FRIENDS: {
    partyType: 'Private',
    inviteRestriction: 'AnyMember',
    onlyLeaderFriendsCanJoin: false,
    presencePermission: 'Noone',
    invitePermission: 'AnyMember',
    acceptingMembers: false,
  },
  PRIVATE: {
    partyType: 'Private',
    inviteRestriction: 'LeaderOnly',
    onlyLeaderFriendsCanJoin: true,
    presencePermission: 'Noone',
    invitePermission: 'Leader',
    acceptingMembers: false,
  },
});

/**
 * Represents the platform of an online Fortnite player:
 * * `WINDOWS`
 * * `MAC`
 * * `PLAYSTATION`
 * * `XBOX`
 * * `SWITCH`
 * * `IOS`
 * * `ANDROID`
 * @typedef {string} Platform
 */
module.exports.Platform = Object.freeze({
  WINDOWS: 'WIN',
  MAC: 'MAC',
  PLAYSTATION: 'PSN',
  XBOX: 'XBL',
  SWITCH: 'SWT',
  IOS: 'IOS',
  ANDROID: 'AND',
});

/**
 * Represents a playlist:
 * * `SOLO`
 * * `DUO`
 * * `SQUAD`
 * * `CREATIVE` - creative don't fill
 * * `CREATIVE_PLAY` - creative fill
 * @typedef {string} Playlist
 */
module.exports.Playlist = Object.freeze({
  SOLO: {
    playlistName: 'Playlist_DefaultSolo',
    tournamentId: '',
    eventWindowId: '',
  },
  DUO: {
    playlistName: 'Playlist_DefaultDuo',
    tournamentId: '',
    eventWindowId: '',
  },
  SQUAD: {
    playlistName: 'Playlist_DefaultSquad',
    tournamentId: '',
    eventWindowId: '',
  },
  CREATIVE: {
    playlistName: 'Playlist_PlaygroundV2',
    tournamentId: '',
    eventWindowId: '',
  },
  CREATIVE_PLAY: {
    playlistName: 'Playlist_Creative_PlayOnly',
    tournamentId: '',
    eventWindowId: '',
  },
});

/**
 * Represents a language (only the ones that are supported by Fortnite):
 * * `ARABIC`
 * * `GERMAN`
 * * `ENGLISH`
 * * `SPANISH`
 * * `FRENCH`
 * * `ITALIAN`
 * * `JAPANESE`
 * * `POLISH`
 * * `RUSSIAN`
 * * `TURKISH`
 * @typedef {string} Language
 */
module.exports.Language = Object.freeze({
  ARABIC: 'ar',
  GERMAN: 'de',
  ENGLISH: 'en',
  SPANISH: 'es',
  FRENCH: 'fr',
  ITALIAN: 'it',
  JAPANESE: 'ja',
  POLISH: 'pl',
  RUSSIAN: 'ru',
  TURKISH: 'tr',
});

/**
 * Represents a Fortnite gamemode:
 * * `BATTLE_ROYALE`
 * * `CREATIVE`
 * * `SAVE_THE_WORLD`
 * @typedef {string} Gamemode
 */
module.exports.Gamemode = Object.freeze({
  BATTLE_ROYALE: 'battleroyale',
  CREATIVE: 'creative',
  SAVE_THE_WORLD: 'savetheworld',
});

/**
 * Represents a Kairos (Party Hub) profile color:
 * * `TEAL`
 * * `SWEET_RED`
 * * `LIGHT_ORANGE`
 * * `GREEN`
 * * `LIGHT_BLUE`
 * * `DARK_BLUE`
 * * `PINK`
 * * `RED`
 * * `GRAY`
 * * `ORANGE`
 * * `DARK_PURPLE`
 * * `LIME`
 * * `INDIGO`
 * @typedef {string} KairosColor
 */
module.exports.KairosColor = Object.freeze({
  TEAL: '["#8EFDE5", "#1CBA9E", "#034D3F"]',
  SWEET_RED: '["#FF81AE", "#D8033C", "#790625"]',
  LIGHT_ORANGE: '["#FFDF00", "#FBA000", "#975B04"]',
  GREEN: '["#CCF95A", "#30C11B", "#194D12"]',
  LIGHT_BLUE: '["#B4F2FE", "#00ACF2", "#005679"]',
  DARK_BLUE: '["#1CA2E6", "#0C5498", "#081E3E"]',
  PINK: '["#FFB4D6", "#FF619C", "#7D3449"]',
  RED: '["#F16712", "#D8033C", "#6E0404"]',
  GRAY: '["#AEC1D3", "#687B8E", "#36404A"]',
  ORANGE: '["#FFAF5D", "#FF6D32", "#852A05"]',
  DARK_PURPLE: '["#E93FEB", "#7B009C", "#500066"]',
  LIME: '["#DFFF73", "#86CF13", "#404B07"]',
  INDIGO: '["#B35EEF", "#4D1397", "#2E0A5D"]',
});

/**
 * Represents a default skin:
 * * `FEMALE_1`
 * * `FEMALE_2`
 * * `FEMALE_3`
 * * `FEMALE_4`
 * * `MALE_1`
 * * `MALE_2`
 * * `MALE_3`
 * * `MALE_4`
 * @typedef {string} DefaultSkin
 */
module.exports.DefaultSkin = Object.freeze({
  FEMALE_1: 'CID_556_Athena_Commando_F_RebirthDefaultA',
  FEMALE_2: 'CID_557_Athena_Commando_F_RebirthDefaultB',
  FEMALE_3: 'CID_558_Athena_Commando_F_RebirthDefaultC',
  FEMALE_4: 'CID_559_Athena_Commando_F_RebirthDefaultD',
  MALE_1: 'CID_560_Athena_Commando_M_RebirthDefaultA',
  MALE_2: 'CID_561_Athena_Commando_M_RebirthDefaultB',
  MALE_3: 'CID_562_Athena_Commando_M_RebirthDefaultC',
  MALE_4: 'CID_563_Athena_Commando_M_RebirthDefaultD',
});

/**
 * Represents a season's start time:
 * * `CH1_S1`
 * * `CH1_S2`
 * * `CH1_S3`
 * * `CH1_S4`
 * * `CH1_S5`
 * * `CH1_S6`
 * * `CH1_S7`
 * * `CH1_S8`
 * * `CH1_S9`
 * * `CH1_S10`
 * * `CH2_S1`
 * * `CH2_S2`
 * * `CH2_S3`
 * * `CH2_S4`
 * @typedef {string} SeasonStart
 */
module.exports.SeasonStart = Object.freeze({
  CH1_S1: 1508889600,
  CH1_S2: 1513209600,
  CH1_S3: 1519257600,
  CH1_S4: 1525132800,
  CH1_S5: 1531353600,
  CH1_S6: 1538006400,
  CH1_S7: 1544054400,
  CH1_S8: 1551312000,
  CH1_S9: 1557360000,
  CH1_S10: 1564617600,
  CH2_S1: 1571097600,
  CH2_S2: 1582156800,
  CH2_S3: 1592352000,
  CH2_S4: 1598486401,
  CH2_S5: 1606867201,
});

/**
 * Represents a season's end time:
 * * `CH1_S1`
 * * `CH1_S2`
 * * `CH1_S3`
 * * `CH1_S4`
 * * `CH1_S5`
 * * `CH1_S6`
 * * `CH1_S7`
 * * `CH1_S8`
 * * `CH1_S9`
 * * `CH1_S10`
 * * `CH2_S1`
 * * `CH2_S2`
 * * `CH2_S3`
 * * `CH2_S4`
 * @typedef {string} SeasonEnd
 */
module.exports.SeasonEnd = Object.freeze({
  CH1_S1: 1513123200,
  CH1_S2: 1519171200,
  CH1_S3: 1525046400,
  CH1_S4: 1531353600,
  CH1_S5: 1538006400,
  CH1_S6: 1544054400,
  CH1_S7: 1551312000,
  CH1_S8: 1557360000,
  CH1_S9: 1564617600,
  CH1_S10: 1570924800,
  CH2_S1: 1582156800,
  CH2_S2: 1592352000,
  CH2_S3: 1598486400,
});

/**
 * Represents a creator code status:
 * * `ACTIVE`
 * * `INACTIVE`
 * @typedef {string} CreatorCodeStatus
 */
module.exports.CreatorCodeStatus = Object.freeze(['ACTIVE', 'INACTIVE']);

/**
 * Represents a pending friend's direction:
 * * `INCOMING`
 * * `OUTGOING`
 * @typedef {string} PendingFriendDirection
 */
module.exports.PendingFriendDirection = Object.freeze(['INCOMING', 'OUTGOING']);

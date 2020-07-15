module.exports.PartyPrivacy = {
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
    presencePermission: 'None',
    invitePermission: 'AnyMember',
    acceptingMembers: false,
  },
  PRIVATE: {
    partyType: 'Private',
    inviteRestriction: 'LeaderOnly',
    onlyLeaderFriendsCanJoin: true,
    presencePermission: 'None',
    invitePermission: 'Leader',
    acceptingMembers: false,
  },
};

module.exports.Platform = {
  WINDOWS: 'WIN',
  MAC: 'MAC',
  PLAYSTATION: 'PSN',
  XBOX: 'XBL',
  SWITCH: 'SWT',
  IOS: 'IOS',
  ANDROID: 'AND',
};

module.exports.Playlist = {
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
};

module.exports.Language = {
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
};

module.exports.Gamemode = {
  BATTLE_ROYALE: 'battleroyale',
  CREATIVE: 'creative',
  SAVE_THE_WORLD: 'savetheworld',
};

module.exports.KairosColor = {
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
};

module.exports.DefaultSkin = {
  FEMALE_1: 'CID_556_Athena_Commando_F_RebirthDefaultA',
  FEMALE_2: 'CID_557_Athena_Commando_F_RebirthDefaultB',
  FEMALE_3: 'CID_558_Athena_Commando_F_RebirthDefaultC',
  FEMALE_4: 'CID_559_Athena_Commando_F_RebirthDefaultD',
  MALE_1: 'CID_560_Athena_Commando_M_RebirthDefaultA',
  MALE_2: 'CID_561_Athena_Commando_M_RebirthDefaultB',
  MALE_3: 'CID_562_Athena_Commando_M_RebirthDefaultC',
  MALE_4: 'CID_563_Athena_Commando_M_RebirthDefaultD',
};

module.exports.SeasonStart = {
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
};

module.exports.SeasonEnd = {
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
};

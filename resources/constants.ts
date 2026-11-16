export const statsKeyRegex = new RegExp('^br_.*(lastmodified|playersoutlived|kills|matchesplayed|minutesplayed|placetop\\d\\d?|score)'
  + '_(gamepad|keyboardmouse|touch)_m0_(.+)$');

export const invalidTokenCodes = [
  'errors.com.epicgames.common.oauth.invalid_token',
  'errors.com.epicgames.common.authentication.token_verification_failed',
  'errors.com.epicgames.unauthorized',
];

export const connectionRetryDelays = [5000, 15000, 60000, 600000];

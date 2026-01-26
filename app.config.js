const appJson = require('./app.json');

module.exports = ({ config }) => {
  const baseConfig = config || appJson.expo || {};
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || baseConfig.extra?.API_BASE_URL;
  const envName = process.env.EXPO_PUBLIC_ENV_NAME || baseConfig.extra?.ENV_NAME;

  if (!apiBaseUrl) {
    throw new Error('Missing EXPO_PUBLIC_API_BASE_URL for build config.');
  }

  if (!envName) {
    throw new Error('Missing EXPO_PUBLIC_ENV_NAME for build config.');
  }

  return {
    ...baseConfig,
    extra: {
      ...(baseConfig.extra || {}),
      API_BASE_URL: apiBaseUrl,
      ENV_NAME: envName,
    },
  };
};

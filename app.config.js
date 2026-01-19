const appJson = require('./app.json');

module.exports = ({ config }) => {
  const baseConfig = config || appJson.expo || {};

  return {
    ...baseConfig,
    extra: {
      ...(baseConfig.extra || {}),
      API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || baseConfig.extra?.API_BASE_URL || '',
    },
  };
};

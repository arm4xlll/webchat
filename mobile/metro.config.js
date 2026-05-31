const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve explicit .js extensions inside ESM packages (react-navigation v7)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;

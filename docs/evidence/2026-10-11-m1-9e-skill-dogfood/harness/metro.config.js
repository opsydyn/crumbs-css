const {getDefaultConfig} = require('expo/metro-config');
const {withNativeStyles} = require('@opsydyn/crumbs-css/metro-plugin');
const config = getDefaultConfig(__dirname);
config.resolver.useWatchman = false;
module.exports = withNativeStyles(config);

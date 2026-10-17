// Owned native-test entry: configure the public API, then load the unchanged app entry.
const { I18nManager } = require("react-native");
const requested = process.env.EXPO_PUBLIC_CRUMBS_QA_RTL === "true";
I18nManager.allowRTL(true);
I18nManager.forceRTL(requested);
console.info("M110B_RTL_STATE " + JSON.stringify({requested,isRTL:I18nManager.isRTL}));
require("./index.js");

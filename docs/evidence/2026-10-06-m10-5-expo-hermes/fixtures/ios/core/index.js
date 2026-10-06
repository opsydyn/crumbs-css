globalThis.__crumbsEntryMs=performance.now();
const {registerRootComponent}=require('expo');
const App=require('./scene').default;
registerRootComponent(App);

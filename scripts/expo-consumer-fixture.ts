import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Identity, Variant } from './expo-consumer-protocol'
export const snapshot = Object.freeze({cards:10,colors:{canvas:'#101827',card:'#1d293d',text:'#f1f5f9',accent:'#7dd3fc'},styles:{root:{flex:1,padding:16,backgroundColor:'#101827'},title:{fontSize:16,color:'#f1f5f9'},description:{fontSize:14,color:'#f1f5f9'},card:{padding:12,marginBottom:8,backgroundColor:'#1d293d'},label:{fontSize:16,color:'#f1f5f9'},action:{height:32,backgroundColor:'#7dd3fc'}}})
export function generateFixture(variant: Variant, identity: Identity) {
  const entrypoint = variant==='plain' ? null : `@opsydyn/crumbs-css/theme${variant==='core'?'/core':''}`
  const tokenStyles = JSON.parse(JSON.stringify(snapshot.styles))
  for(const style of Object.values(tokenStyles) as Record<string,unknown>[]) for(const key of Object.keys(style)) for(const [name,color] of Object.entries(snapshot.colors)) if(style[key]===color)style[key]={$$type:'crumbs.css.theme-token',varName:`--crumbs-m105-${name}`}
  const definitionsSource=JSON.stringify(tokenStyles).replace(/\{"\$\$type":"crumbs\.css\.theme-token","varName":("[^"]+")\}/g,'createThemeTokenReference($1)')
  const scene = `const React=require('react'); const {View,Text,StyleSheet,Linking}=require('react-native');
const identity=${JSON.stringify(identity)};
const nativeStyles=${JSON.stringify(snapshot.styles)};
${entrypoint?`const {ThemeProvider,useThemedStyles,createThemeTokenReference}=require(${JSON.stringify(entrypoint)});
const theme={contract:{},values:{},tokens:${JSON.stringify(Object.fromEntries(Object.entries(snapshot.colors).map(([k,v])=>[`--crumbs-m105-${k}`,v])))}};
const definitions=${definitionsSource};`:'const styles=StyleSheet.create(nativeStyles);'}
let delivered=false;
function layout(event){ const {width,height}=event.nativeEvent.layout;if(delivered||width<=0||height<=0)return;const layoutMs=performance.now();delivered=true;
 const frozen=Object.freeze({identity,entryMs:globalThis.__crumbsEntryMs,layoutMs,elapsedMs:layoutMs-globalThis.__crumbsEntryMs,width,height,dev:__DEV__,hermes:typeof HermesInternal!=='undefined'});
 Linking.getInitialURL().then(url=>{if(!url)throw Error('Missing cold-launch URL');const u=new URL(url);if(u.protocol!=='crumbsm105'+identity.variant+':')throw Error('Wrong scheme');for(const key of ['studyId','buildId','variant'])if(u.searchParams.get(key)!==identity[key])throw Error('Wrong '+key);const runId=u.searchParams.get('runId'),deviceId=u.searchParams.get('deviceId'),port=u.searchParams.get('port'),token=u.searchParams.get('token');if(!runId||!deviceId||!port||!token)throw Error('Incomplete permit');return fetch('http://127.0.0.1:'+port+'/receipt',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({...frozen,runId,deviceId})});}).catch(error=>console.error('Crumbs measurement delivery failed',String(error))); }
function Scene(){${entrypoint?'const styles=useThemedStyles(definitions);':''}return React.createElement(View,{style:styles.root,onLayout:layout},React.createElement(Text,{style:styles.title},'Crumbs consumer study'),React.createElement(Text,{style:styles.description},'One fixed themed screen'),...Array.from({length:10},(_,i)=>React.createElement(View,{key:i,style:styles.card},React.createElement(Text,{style:styles.label},'Card '+i),React.createElement(View,{style:styles.action}))));}
module.exports.default=${entrypoint?'function App(){return React.createElement(ThemeProvider,{theme},React.createElement(Scene));}':'Scene'};
`
  return {entry:`globalThis.__crumbsEntryMs=performance.now();\nconst {registerRootComponent}=require('expo');\nconst App=require('./scene').default;\nregisterRootComponent(App);\n`,scene,snapshot,entrypoint,manifest:{dependencies:entrypoint?{'@opsydyn/crumbs-css':'packed'}:{}}}
}
export async function stageFixtures(options:{root:string;archive:string;tarball:string;exactDependencies:Record<string,string>;exactDevDependencies?:Record<string,string>;studyId:string;sourceHash:string;identities:Record<Variant,Identity>}):Promise<Record<Variant,string>> {
 const result={} as Record<Variant,string>
 for(const variant of ['plain','core','compatibility'] as const){
  const dir=join(options.archive,'apps',variant);await mkdir(dir,{recursive:true});result[variant]=dir
  const template=join(options.root,'apps/playground');const manifest=JSON.parse(await readFile(join(template,'package.json'),'utf8'))
  for(const name of ['babel.config.js'])await cp(join(template,name),join(dir,name))
  await writeFile(join(dir,'tsconfig.json'),JSON.stringify({extends:'expo/tsconfig.base',compilerOptions:{allowJs:true,checkJs:true,strict:false,noEmit:true,skipLibCheck:true},include:['index.js','scene.js']}))
  const fixture=generateFixture(variant,options.identities[variant]);await writeFile(join(dir,'index.js'),fixture.entry);await writeFile(join(dir,'scene.js'),fixture.scene)
  manifest.name=`crumbs-m105-${variant}`;manifest.devDependencies={...options.exactDevDependencies};manifest.dependencies={...options.exactDependencies};delete manifest.dependencies['@opsydyn/crumbs-css'];if(variant!=='plain')manifest.dependencies['@opsydyn/crumbs-css']=`file:${options.tarball}`
  await writeFile(join(dir,'package.json'),JSON.stringify(manifest,null,2));
  await writeFile(join(dir,'metro.config.js'),"const {getDefaultConfig}=require('expo/metro-config');const config=getDefaultConfig(__dirname);config.resolver.useWatchman=false;module.exports=config;\n")
  await writeFile(join(dir,'app.json'),JSON.stringify({expo:{name:`Crumbs M105 ${variant}`,slug:`crumbs-m105-${variant}`,scheme:`crumbsm105${variant}`,jsEngine:'hermes',ios:{bundleIdentifier:`dev.crumbs.m105.${variant}`,infoPlist:{NSAppTransportSecurity:{NSAllowsLocalNetworking:true}}},android:{package:`dev.crumbs.m105.${variant}`}}},null,2))
 }
 return result
}

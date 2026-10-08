import pathlib,json,os,shutil,uuid
root=pathlib.Path('/private/tmp/crumbs-m105-consumer-decision-20261008');root.mkdir(exist_ok=False)
repo=pathlib.Path('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css')
healthy=pathlib.Path('/private/tmp/crumbs-css-m105-clean/apps/playground')
study=str(uuid.uuid4());(root/'study.json').write_text(json.dumps({'id':study,'revision':'dec04d8','sourceDigest':'8fe7d6c28c26c9d4214549790d504c62f87c24f6886d7da40e031dd7e9fb4a76','device':'61DFB462-1FBF-4632-8302-1DD067E15D57'}))
scene=r'''
const React=require('react');
const {View,Text,FlatList,StyleSheet,Platform}=require('react-native');
const samples=[],observations=[],counts={mounts:0,unmounts:0};
const importedAt=performance.now();
LIBRARY
const moduleImportMs=performance.now()-importedAt;
const light={contract:{},values:{},tokens:{'--crumbs-probe-card':'#ffffff','--crumbs-probe-text':'#172438'}};
const dark={contract:{},values:{},tokens:{'--crumbs-probe-card':'#172438','--crumbs-probe-text':'#ffffff'}};
DEFINITIONS
const data100=Array.from({length:100},(_,id)=>({id:String(id)}));
const data1000=Array.from({length:1000},(_,id)=>({id:String(id)}));
const plan=[];for(const size of [100,1000])for(let cycle=0;cycle<5;cycle++)for(const action of ['mount','rerender','theme-switch','unmount'])plan.push({size,cycle,action,theme:action==='theme-switch'?'dark':'light'});
function Row({item,styles}){React.useLayoutEffect(()=>{counts.mounts++;return()=>{counts.unmounts++}},[]);return React.createElement(View,{style:styles.panel},React.createElement(Text,{style:styles.copy},'Measured component '+item.id));}
function List({step,index}){
 const began=performance.now();GET_STYLES
 const resolveMs=performance.now()-began;
 const previous=React.useRef();
 React.useLayoutEffect(()=>{samples.push({index,action:step.action,size:step.size,resolveMs,identity:previous.current===undefined?'initial':previous.current===styles?'same':'changed',panel:styles.panel.backgroundColor,text:styles.copy.color});previous.current=styles;},[index,styles]);
 return React.createElement(FlatList,{data:step.size===100?data100:data1000,keyExtractor:item=>item.id,initialNumToRender:10,maxToRenderPerBatch:10,windowSize:5,renderItem:({item})=>React.createElement(Row,{item,styles})});
}
let layout=null;function rootLayout(e){if(!layout&&e.nativeEvent.layout.width>0&&e.nativeEvent.layout.height>0)layout={...e.nativeEvent.layout,entryToLayoutMs:performance.now()-globalThis.__entry};}
function App(){const [index,setIndex]=React.useState(0);const request=React.useRef(performance.now());const step=plan[index];
 React.useLayoutEffect(()=>{observations.push({index,...step,requestToLayoutEffectMs:performance.now()-request.current,mounts:counts.mounts,unmounts:counts.unmounts});
 const timer=setTimeout(()=>{if(index+1===plan.length){const receipt={study:STUDY,variant:VARIANT,dev:__DEV__,hermes:typeof HermesInternal!=='undefined',platform:Platform.OS,reactNative:Platform.constants.reactNativeVersion,react:React.version,moduleImportMs,layout,plan,observations,samples,counts};fetch('http://127.0.0.1:18765/receipt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(receipt)}).catch(e=>console.error(String(e)));}else{request.current=performance.now();setIndex(index+1)}},250);return()=>clearTimeout(timer);},[index]);
 const child=step.action==='unmount'?null:React.createElement(List,{key:step.size+'-'+step.cycle,step,index});
 return React.createElement(View,{style:{flex:1,padding:16,backgroundColor:'#f2f4f8'},onLayout:rootLayout},React.createElement(Text,null,'M10.5 consumer diagnostic '+VARIANT),WRAPPED);
}
module.exports.default=App;
'''
for variant in ['plain','core','compatibility']:
 stage=root/variant;stage.mkdir();nm=stage/'node_modules';nm.mkdir()
 for dep in ['expo','react','react-native','babel-preset-expo','react-dom','react-native-web','typescript']:(nm/dep).symlink_to(healthy/'node_modules'/dep,target_is_directory=True)
 for scope in ['@expo','@types','@rn-primitives','@vanilla-extract']:(nm/scope).symlink_to(healthy/'node_modules'/scope,target_is_directory=True)
 (nm/'.bin').mkdir();(nm/'.bin/expo').symlink_to(healthy/'node_modules/.bin/expo')
 if variant!='plain':
  pkg=nm/'@opsydyn/crumbs-css';pkg.mkdir(parents=True);shutil.copy2(repo/'packages/css/package.json',pkg/'package.json');shutil.copytree(repo/'packages/css/dist',pkg/'dist')
 manifest=json.loads((healthy/'package.json').read_text());manifest['name']='crumbs-diagnostic-'+variant;manifest['main']='index.js';manifest['dependencies'].pop('@opsydyn/crumbs-css',None)
 if variant!='plain':manifest['dependencies']['@opsydyn/crumbs-css']=json.loads((repo/'packages/css/package.json').read_text())['version']
 (stage/'package.json').write_text(json.dumps(manifest));shutil.copy2(healthy/'babel.config.js',stage/'babel.config.js')
 (stage/'metro.config.js').write_text("const {getDefaultConfig}=require('expo/metro-config');const config=getDefaultConfig(__dirname);config.resolver.useWatchman=false;config.watchFolders=['/private/tmp/crumbs-css-m105-clean/node_modules'];module.exports=config;\n")
 (stage/'app.json').write_text(json.dumps({'expo':{'name':'Crumbs Diagnostic '+variant,'slug':'crumbs-diagnostic-'+variant,'jsEngine':'hermes','ios':{'bundleIdentifier':'dev.crumbs.m105.diagnostic.'+variant,'infoPlist':{'NSAppTransportSecurity':{'NSAllowsLocalNetworking':True}}}}}))
 library="const {ThemeProvider,useThemedStyles,createThemeTokenReference}=require('@opsydyn/crumbs-css/theme"+('/core' if variant=='core' else '')+"');" if variant!='plain' else ''
 defs="const definitions={panel:{height:80,padding:16,backgroundColor:createThemeTokenReference('--crumbs-probe-card')},copy:{fontSize:16,color:createThemeTokenReference('--crumbs-probe-text')}};" if variant!='plain' else "const plainLight=StyleSheet.create({panel:{height:80,padding:16,backgroundColor:'#ffffff'},copy:{fontSize:16,color:'#172438'}});const plainDark=StyleSheet.create({panel:{height:80,padding:16,backgroundColor:'#172438'},copy:{fontSize:16,color:'#ffffff'}});"
 rendered=scene.replace('LIBRARY',library).replace('DEFINITIONS',defs).replace('GET_STYLES',"const styles=useThemedStyles(definitions);" if variant!='plain' else "const styles=step.theme==='dark'?plainDark:plainLight;").replace('WRAPPED',"React.createElement(ThemeProvider,{theme:step.theme==='dark'?dark:light},child)" if variant!='plain' else 'child').replace('STUDY',json.dumps(study)).replace('VARIANT',json.dumps(variant))
 (stage/'scene.js').write_text(rendered);(stage/'index.js').write_text("globalThis.__entry=performance.now();const {registerRootComponent}=require('expo');const App=require('./scene').default;registerRootComponent(App);\n")
print(root)

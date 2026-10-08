
const React=require('react');
const {View,Text,FlatList,StyleSheet,Platform}=require('react-native');
const samples=[],observations=[],counts={mounts:0,unmounts:0};
const importedAt=performance.now();
const {ThemeProvider,useThemedStyles,createThemeTokenReference}=require('@opsydyn/crumbs-css/theme/core');
const moduleImportMs=performance.now()-importedAt;
const light={contract:{},values:{},tokens:{'--crumbs-probe-card':'#ffffff','--crumbs-probe-text':'#172438'}};
const dark={contract:{},values:{},tokens:{'--crumbs-probe-card':'#172438','--crumbs-probe-text':'#ffffff'}};
const definitions={panel:{height:80,padding:16,backgroundColor:createThemeTokenReference('--crumbs-probe-card')},copy:{fontSize:16,color:createThemeTokenReference('--crumbs-probe-text')}};
const data100=Array.from({length:100},(_,id)=>({id:String(id)}));
const data1000=Array.from({length:1000},(_,id)=>({id:String(id)}));
const plan=[];for(const size of [100,1000])for(let cycle=0;cycle<5;cycle++)for(const action of ['mount','rerender','theme-switch','unmount'])plan.push({size,cycle,action,theme:action==='theme-switch'?'dark':'light'});
function Row({item,styles}){React.useLayoutEffect(()=>{counts.mounts++;return()=>{counts.unmounts++}},[]);return React.createElement(View,{style:styles.panel},React.createElement(Text,{style:styles.copy},'Measured component '+item.id));}
function List({step,index}){
 const began=performance.now();const styles=useThemedStyles(definitions);
 const resolveMs=performance.now()-began;
 const previous=React.useRef();
 React.useLayoutEffect(()=>{samples.push({index,action:step.action,size:step.size,resolveMs,identity:previous.current===undefined?'initial':previous.current===styles?'same':'changed',panel:styles.panel.backgroundColor,text:styles.copy.color});previous.current=styles;},[index,styles]);
 return React.createElement(FlatList,{data:step.size===100?data100:data1000,keyExtractor:item=>item.id,initialNumToRender:10,maxToRenderPerBatch:10,windowSize:5,renderItem:({item})=>React.createElement(Row,{item,styles})});
}
let layout=null;function rootLayout(e){if(!layout&&e.nativeEvent.layout.width>0&&e.nativeEvent.layout.height>0)layout={...e.nativeEvent.layout,entryToLayoutMs:performance.now()-globalThis.__entry};}
function App(){const [index,setIndex]=React.useState(0);const request=React.useRef(performance.now());const step=plan[index];
 React.useLayoutEffect(()=>{observations.push({index,...step,requestToLayoutEffectMs:performance.now()-request.current,mounts:counts.mounts,unmounts:counts.unmounts});
 const timer=setTimeout(()=>{if(index+1===plan.length){const receipt={study:"da770097-d50e-4146-8574-f24d4dd63f8e",variant:"core",dev:__DEV__,hermes:typeof HermesInternal!=='undefined',platform:Platform.OS,reactNative:Platform.constants.reactNativeVersion,react:React.version,moduleImportMs,layout,plan,observations,samples,counts};fetch('http://127.0.0.1:18765/receipt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(receipt)}).catch(e=>console.error(String(e)));}else{request.current=performance.now();setIndex(index+1)}},250);return()=>clearTimeout(timer);},[index]);
 const child=step.action==='unmount'?null:React.createElement(List,{key:step.size+'-'+step.cycle,step,index});
 return React.createElement(View,{style:{flex:1,padding:16,backgroundColor:'#f2f4f8'},onLayout:rootLayout},React.createElement(Text,null,'M10.5 consumer diagnostic '+"core"),React.createElement(ThemeProvider,{theme:step.theme==='dark'?dark:light},child));
}
module.exports.default=App;

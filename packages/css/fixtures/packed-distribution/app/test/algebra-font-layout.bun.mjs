import assert from 'node:assert/strict';
import {mock} from 'bun:test';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import * as React from 'react';
import Renderer,{act} from 'react-test-renderer';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let mounts=0;
function NativeText(props){const [instance]=React.useState(()=>++mounts);return React.createElement('Text',{...props,instance});}
mock.module('react-native',()=>({Text:NativeText,View:'View',Pressable:'Pressable'}));
const probe=new URL('../src/algebra-layout-probe.tsx',import.meta.url);
const source=await readFile(new URL('../src/AlgebraPanel.tsx',import.meta.url),'utf8');
assert(source.includes("import * as styles from './algebra-panel.css';"));
await writeFile(probe,source.replace("import * as styles from './algebra-panel.css';","const styles={panel:{},row:{},control:{},swatch:{},label:{},heading:{},sample:{alignSelf:'flex-start'}};"));
let AlgebraPanel;try{({AlgebraPanel}=await import(probe.href));}finally{await unlink(probe);}
let tree;await act(async()=>{tree=Renderer.create(React.createElement(AlgebraPanel,{nativeFontScale:1}));});
const sample=id=>tree.root.findAllByType('Text').find(t=>t.props.testID===id).props;
const ids=['algebra-generated-text','algebra-control-text'],before=ids.map(sample);
await act(async()=>{tree.root.findByProps({testID:'algebra-unrelated'}).props.onPress();});
assert(ids.map(sample).every((x,i)=>x.instance===before[i].instance),'Unrelated control remounted text');
await act(async()=>{tree.update(React.createElement(AlgebraPanel,{nativeFontScale:1.353}));});
const after=ids.map(sample);
assert(after.every((x,i)=>x.instance!==before[i].instance),'Native font change left cached Text measurements mounted');
assert(after.every((x,i)=>JSON.stringify(x.style)===JSON.stringify(before[i].style)&&x.allowFontScaling===true),'Font scale changed helper metrics/scaling ownership');
await act(async()=>{tree.unmount();});
console.log(JSON.stringify({fontLayoutLifecycle:'passed',baseMetrics:'unchanged',nativeFontScale:1.353}));

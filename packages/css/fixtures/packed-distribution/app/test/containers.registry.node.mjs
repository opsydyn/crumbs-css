import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createContext} from 'react';
const require=createRequire(import.meta.url), mode=process.argv[2], format=process.argv[3]??'esm', key=Symbol.for('crumbs.css.container-context.v1');
let calls=0;
const getter=()=>{calls++;throw Error('getter executed')};
const slot={formatVersion:1,reactCreateContext:createContext,context:createContext(null)};
if(mode==='slot-accessor') Object.defineProperty(globalThis,key,{get:getter});
else {
    if(mode==='version') slot.formatVersion=2;
    if(mode==='field-accessor') Object.defineProperty(slot,'context',{get:getter});
    if(mode==='react') slot.reactCreateContext=()=>{};
    if(mode==='context') slot.context={$$typeof:Symbol.for('react.context'),get Provider(){return getter()}};
    if(mode==='extra') slot.extra=1;
    if(mode.startsWith('abi-getter-')) Object.defineProperty(slot.context,mode.slice('abi-getter-'.length),{get:getter,set:getter});
    if(mode==='abi-missing') delete slot.context._currentValue2;
    if(mode==='abi-frozen') Object.freeze(slot.context);
    if(mode==='abi-consumer') Object.defineProperty(slot.context.Consumer,'_context',{get:getter});
    if(mode==='abi-forged') { slot.context={$$typeof:Symbol.for('react.context')}; slot.context.Provider=slot.context; }
    Object.defineProperty(globalThis,key,{value:Object.freeze(slot)});
}
try {
    if(format==='esm') await import('@opsydyn/crumbs-css/theme/containers');
    else require('@opsydyn/crumbs-css/theme/containers');
    assert.fail('invalid slot accepted');
} catch(error) { assert.match(String(error),/CONTAINER_UNSUPPORTED_VERSION/); }
assert.equal(calls,0);
console.log(JSON.stringify({version:process.version,mode,format,calls,status:'passed'}));

import {pureFunction} from '@acme/crumbs-extensions/authoring';
import {defineExtension} from '../node_modules/@opsydyn/crumbs-css-copy/dist/extensions.mjs';
import {viewStyle} from '@opsydyn/crumbs-css/style';
const copied=defineExtension<{make:(...args:unknown[])=>()=>readonly unknown[]}>().factory({importPath:'@acme/crumbs-extensions/pure-runtime',importName:'make'});
export const first=pureFunction(viewStyle({opacity:0.5}),Object.assign(Object.create(null),{missing:undefined,n:-0}),undefined);
export const alias=first;
export const nested=[first];
export const second=copied(viewStyle({opacity:0.5}),Object.assign(Object.create(null),{missing:undefined,n:-0}),undefined);

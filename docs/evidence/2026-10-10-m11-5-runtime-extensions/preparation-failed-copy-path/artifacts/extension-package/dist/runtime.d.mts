import type {ViewProps,ViewStyle} from 'react-native';
export type ExtensionCounts=Readonly<{factories:number;mounts:number}>;
export declare function createStyledView(baseStyle:ViewStyle):(props:ViewProps)=>import('react').ReactElement;
export declare function createThemedView(baseStyle:ViewStyle):(props:ViewProps)=>import('react').ReactElement;
export declare function getExtensionCounts():ExtensionCounts;
export declare function subscribeExtensionCounts(listener:()=>void):()=>void;

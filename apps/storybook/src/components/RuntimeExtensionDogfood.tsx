import { useWindowDimensions } from 'react-native';
import { ExtensionPanel } from './runtime-extensions/ExtensionPanel';
export function RuntimeExtensionDogfood() { return <ExtensionPanel nativeFontScale={useWindowDimensions().fontScale}/>; }

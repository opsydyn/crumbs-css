import { useWindowDimensions } from 'react-native';
import { ExtensionPanel } from '../../storybook/src/components/runtime-extensions/ExtensionPanel';
export function RuntimeExtensionPanel() { return <ExtensionPanel nativeFontScale={useWindowDimensions().fontScale}/>; }

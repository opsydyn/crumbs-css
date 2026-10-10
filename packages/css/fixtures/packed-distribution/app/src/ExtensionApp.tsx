import { ScrollView, View, useWindowDimensions } from 'react-native';
import { ExtensionPanel } from './ExtensionPanel';
export function ExtensionApp() { return <View style={{ flex: 1, paddingTop: 60, backgroundColor: '#ffffff' }}><ScrollView><ExtensionPanel nativeFontScale={useWindowDimensions().fontScale}/></ScrollView></View>; }

import { ScrollView, View, useWindowDimensions } from 'react-native';
import { AlgebraPanel } from './AlgebraPanel';
export function AlgebraApp() { const { fontScale } = useWindowDimensions(); return <View style={{ flex: 1, paddingTop: 60, backgroundColor: '#ffffff' }}><ScrollView><AlgebraPanel nativeFontScale={fontScale}/></ScrollView></View>; }

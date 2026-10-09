import { useWindowDimensions } from 'react-native';
import { AlgebraPanel } from './token-algebra/AlgebraPanel';
export function TokenAlgebraDogfood() { const { fontScale } = useWindowDimensions(); return <AlgebraPanel nativeFontScale={fontScale}/>; }

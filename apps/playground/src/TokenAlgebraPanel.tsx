import { useWindowDimensions } from 'react-native';
import { AlgebraPanel } from '../../storybook/src/components/token-algebra/AlgebraPanel';
export function TokenAlgebraPanel() { const { fontScale } = useWindowDimensions(); return <AlgebraPanel nativeFontScale={fontScale}/>; }

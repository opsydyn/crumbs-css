import { useNativeConditions } from './AppThemeProvider';
import { MotionPanel } from './native-motion/MotionPanel';
export function NativeMotionDogfood() { const { snapshot } = useNativeConditions(); return <MotionPanel motion={snapshot.motion}/>; }

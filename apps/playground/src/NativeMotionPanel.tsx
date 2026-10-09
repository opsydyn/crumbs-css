import { useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { createNativeConditionStore, useNativeConditionSnapshot } from '@opsydyn/crumbs-css/theme/conditions';
import type { NativePlatform } from '@opsydyn/crumbs-css/theme/conditions';
import { createNativeAccessibilityConditionSource } from '../../storybook/src/accessibility/native-condition-source';
import { MotionPanel } from '../../storybook/src/components/native-motion/MotionPanel';
export function NativeMotionPanel() { const [store] = useState(() => createNativeConditionStore({ initial: { platform: Platform.OS as NativePlatform, reducedMotion: true }, sources: [createNativeAccessibilityConditionSource(Platform.OS as NativePlatform, { isReduceMotionEnabled: () => AccessibilityInfo.isReduceMotionEnabled(), isHighTextContrastEnabled: () => AccessibilityInfo.isHighTextContrastEnabled(), isDarkerSystemColorsEnabled: () => AccessibilityInfo.isDarkerSystemColorsEnabled(), addEventListener: (event, listener) => AccessibilityInfo.addEventListener(event, listener) })] })); const snapshot = useNativeConditionSnapshot(store); return <MotionPanel motion={snapshot.motion}/>; }

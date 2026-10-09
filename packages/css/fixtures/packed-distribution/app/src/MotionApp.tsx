import { useState } from 'react';
import { AccessibilityInfo, Platform, ScrollView, View } from 'react-native';
import { createNativeConditionStore, useNativeConditionSnapshot } from '@opsydyn/crumbs-css/theme/conditions';
import type { NativePlatform } from '@opsydyn/crumbs-css/theme/conditions';
import { createNativeAccessibilityConditionSource } from './native-condition-source';
import { MotionPanel } from './MotionPanel';
export function MotionApp() { const [store] = useState(() => createNativeConditionStore({ initial: { platform: Platform.OS as NativePlatform, reducedMotion: true }, sources: [createNativeAccessibilityConditionSource(Platform.OS as NativePlatform, { isReduceMotionEnabled: () => AccessibilityInfo.isReduceMotionEnabled(), isHighTextContrastEnabled: () => AccessibilityInfo.isHighTextContrastEnabled(), isDarkerSystemColorsEnabled: () => AccessibilityInfo.isDarkerSystemColorsEnabled(), addEventListener: (event, listener) => AccessibilityInfo.addEventListener(event, listener) })] })); const snapshot = useNativeConditionSnapshot(store); return <View style={{ flex: 1, paddingTop: 60, backgroundColor: '#ffffff' }}><ScrollView><MotionPanel motion={snapshot.motion}/></ScrollView></View>; }

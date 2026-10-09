import { viewStyle, textStyle } from '@opsydyn/crumbs-css/style';
export const column = viewStyle({ flexDirection: 'column', gap: 8, padding: 8, backgroundColor: '#e2e8f0' });
export const row = viewStyle({ flexDirection: 'row', gap: 8, padding: 8, backgroundColor: '#dbeafe' });
export const chip = viewStyle({ width: 64, height: 24, backgroundColor: '#2457d6', justifyContent: 'center', alignItems: 'center', borderRadius: 4 });
export const copy = textStyle({ color: '#111827', fontSize: 12 });
export const chipCopy = textStyle({ color: '#ffffff', fontSize: 12 });
export const control = viewStyle({ padding: 8, minHeight: 38, borderWidth: 1, borderColor: '#94a3b8', borderRadius: 6, width: '23%' });

import { viewStyle, textStyle } from '@opsydyn/crumbs-css/style';
export const panel = viewStyle({ gap: 8, padding: 12, backgroundColor: '#ffffff' });
export const row = viewStyle({ flexDirection: 'row', flexWrap: 'wrap', gap: 6 });
export const track = viewStyle({ width: 200, height: 52, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#64748b' });
export const marker = viewStyle({ width: 48, height: 48 });
export const control = viewStyle({ padding: 7, minHeight: 32, borderWidth: 1, borderColor: '#64748b', borderRadius: 4 });
export const copy = textStyle({ fontSize: 12, color: '#111827' });
export const heading = textStyle({ fontSize: 16, fontWeight: '700', color: '#111827' });

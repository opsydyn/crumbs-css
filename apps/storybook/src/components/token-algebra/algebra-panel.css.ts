import { viewStyle, textStyle } from '@opsydyn/crumbs-css/style';
export const panel = viewStyle({ padding: 8, gap: 6, backgroundColor: '#ffffff', opacity: 1 });
export const row = viewStyle({ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' });
export const control = viewStyle({ padding: 6, minHeight: 32, borderWidth: 1, borderColor: '#64748b', borderRadius: 4, backgroundColor: '#ffffff' });
export const swatch = viewStyle({ width: 48, height: 40 });
export const label = textStyle({ fontSize: 12, color: '#111827' });
export const heading = textStyle({ fontSize: 18, fontWeight: '700', color: '#111827' });
export const sample = textStyle({ color: '#111827', alignSelf: 'flex-start' });

import type { ViewStyle } from 'react-native';
export type ExtensionSelection = {
    foundation: 'blue' | 'red';
    mode: 'literal' | 'themed';
    theme: 'light' | 'dark';
    override: boolean;
};
export const extensionBaseMetrics = { fontSize: 16, lineHeight: 24 } as const;
/** Independently handwritten control; does not call the generated factory. */
export function extensionControlStyle(input: ExtensionSelection): ViewStyle { return { backgroundColor: input.override ? '#00aa00' : input.mode === 'themed' && input.theme === 'dark' ? (input.foundation === 'blue' ? '#000080' : '#800000') : (input.foundation === 'blue' ? '#0000ff' : '#ff0000'), padding: 12, borderRadius: 8 }; }

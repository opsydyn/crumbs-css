/** Independent ordinary-value representation; preserves own undefined, -0 and null prototypes. */
export function extensionValueShape(value: unknown): unknown {
    if (typeof value === 'number')
        return Object.is(value, -0) ? ['number', 'negative-zero'] : ['number', value];
    if (value === undefined)
        return ['undefined'];
    if (value === null || typeof value !== 'object')
        return [typeof value, value];
    if (Array.isArray(value))
        return ['array', value.map(extensionValueShape)];
    return ['record', Object.getPrototypeOf(value) === null, Object.keys(value).map(key => [key, extensionValueShape((value as Record<string, unknown>)[key])])];
}

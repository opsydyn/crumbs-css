export function expectedContainerBucket(buckets: readonly {
    name: string;
    min: number;
}[], size: number | undefined): string {
    if (size === undefined)
        return 'unmeasured';
    const index = buckets.findIndex((b, i) => size >= b.min && (i === buckets.length - 1 || size < buckets[i + 1]!.min));
    if (index < 0)
        throw Error('invalid oracle input');
    return buckets[index]!.name;
}

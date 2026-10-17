import { createNativeStylesCacheStore } from '../src/transform-cache';
// Metro0.87 permits an explicitly undefined cache-store name. The wrapper
// already provides a concrete fallback name; its input must accept this shape.
createNativeStylesCacheStore<number>({
    name: undefined,
    get: () => null,
    set: () => {},
    clear: () => {},
});

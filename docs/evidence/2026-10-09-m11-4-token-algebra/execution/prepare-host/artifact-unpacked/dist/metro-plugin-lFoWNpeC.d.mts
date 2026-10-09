import { MetroConfig } from "metro";

//#region ../../../../../../../../private/var/folders/wv/3m5dhh6x5pv9w0fbfzymldnw0000gn/T/crumbs-m113-install-7lg64y_0/node_modules/.bun/metro-cache@0.84.5/node_modules/metro-cache/src/types.d.ts
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noformat
 * @oncall react_native
 * @generated SignedSource<<80dd2674720fe89c7a90a649a922cb1d>>
 *
 * This file was translated from Flow by scripts/generateTypeScriptDefinitions.js
 * Original file: packages/metro-cache/src/types.js
 * To regenerate, run:
 *   js1 build metro-ts-defs (internal) OR
 *   yarn run build-ts-defs (OSS) 
 */
interface CacheStore<T> {
  name?: string;
  get(key: Buffer): (null | undefined | T) | Promise<null | undefined | T>;
  set(key: Buffer, value: T): void | Promise<void>;
  clear(): void | Promise<void>;
}
//#endregion
//#region src/transform-cache.d.ts
declare function createNativeStylesCacheStore<T>(inner: CacheStore<T>): CacheStore<T>;
//#endregion
//#region src/metro-plugin.d.ts
declare function withNativeStyles(config: MetroConfig): MetroConfig;
//#endregion
export { createNativeStylesCacheStore as n, withNativeStyles as t };
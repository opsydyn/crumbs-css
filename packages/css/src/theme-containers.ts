/** Optional finite native layout ownership; React is the only runtime dependency. */
export { defineContainer, getContainerBucket } from "./containers/definition";
export { resolveContainerValue } from "./containers/values";
export { useContainerLayout, ContainerProvider, useContainerValue } from "./containers/react";
export type { NativeContainerAxis, NativeContainerDefinitionInput, NativeContainerDefinition, NativeContainerBucket, NativeContainerValues, NativeContainerLayout, ContainerProviderProps } from "./containers/model";

import { t as TokenContractIdentity } from "./identity-DwBRSt_G.mjs";
import { LayoutChangeEvent } from "react-native";
import { ReactElement, ReactNode } from "react";

//#region src/containers/model.d.ts
declare const bucketBrand: unique symbol;
declare const layoutBrand: unique symbol;
type NativeContainerAxis = "width" | "height";
type NativeContainerDefinitionInput<B extends Readonly<Record<string, number>> = Readonly<Record<string, number>>> = {
  readonly owner: string;
  readonly name: string;
  readonly version: number;
  readonly axis: NativeContainerAxis;
  readonly buckets: B;
};
type NativeContainerDefinition<Bucket extends string = string> = {
  readonly $$type: "crumbs.css.container-definition";
  readonly formatVersion: 1;
  readonly identity: TokenContractIdentity;
  readonly axis: NativeContainerAxis;
  readonly buckets: readonly {
    readonly name: Bucket;
    readonly min: number;
  }[];
  readonly [bucketBrand]: Bucket;
};
type NativeContainerBucket<D extends NativeContainerDefinition> = D["buckets"][number]["name"] | "unmeasured";
type NativeContainerValues<D extends NativeContainerDefinition, V = unknown> = Readonly<Record<NativeContainerBucket<D>, V>>;
type ExactContainerValues<D extends NativeContainerDefinition, V> = V & { [K in Exclude<keyof V, NativeContainerBucket<D>>]: never };
type NativeContainerLayout<D extends NativeContainerDefinition = NativeContainerDefinition> = {
  readonly definition: D;
  readonly onLayout: (event: LayoutChangeEvent) => void;
  readonly [layoutBrand]: D;
};
type ContainerProviderProps<D extends NativeContainerDefinition = NativeContainerDefinition> = {
  readonly layout: NativeContainerLayout<D>;
  readonly children?: ReactNode;
};
//#endregion
//#region src/containers/definition.d.ts
declare function defineContainer<const B extends Readonly<Record<string, number>>>(input: NativeContainerDefinitionInput<B>): NativeContainerDefinition<Extract<keyof B, string>>;
declare function getContainerBucket<const D extends NativeContainerDefinition>(definition: D, size?: number): NativeContainerBucket<D>;
//#endregion
//#region src/containers/values.d.ts
declare function resolveContainerValue<const D extends NativeContainerDefinition, const V extends NativeContainerValues<NoInfer<D>, unknown>>(definition: D, bucket: NoInfer<NativeContainerBucket<D>>, values: ExactContainerValues<NoInfer<D>, V>): V[NativeContainerBucket<D>];
//#endregion
//#region src/containers/react.d.ts
declare function useContainerLayout<const D extends NativeContainerDefinition>(definition: D): NativeContainerLayout<D>;
declare function ContainerProvider<D extends NativeContainerDefinition>({
  layout,
  children
}: ContainerProviderProps<D>): ReactElement;
declare function useContainerValue<const D extends NativeContainerDefinition, const V extends NativeContainerValues<NoInfer<D>, unknown>>(definition: D, values: ExactContainerValues<NoInfer<D>, V>): V[NativeContainerBucket<D>];
//#endregion
export { ContainerProvider, type ContainerProviderProps, type NativeContainerAxis, type NativeContainerBucket, type NativeContainerDefinition, type NativeContainerDefinitionInput, type NativeContainerLayout, type NativeContainerValues, defineContainer, getContainerBucket, resolveContainerValue, useContainerLayout, useContainerValue };
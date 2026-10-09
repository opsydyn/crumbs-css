import type { LayoutChangeEvent } from "react-native";
import type { ReactNode } from "react";
import type { TokenContractIdentity } from "../tokens/identity";
declare const bucketBrand: unique symbol;
declare const valuesBrand: unique symbol;
declare const layoutBrand: unique symbol;
export type NativeContainerAxis = "width" | "height";
export type NativeContainerDefinitionInput<B extends Readonly<Record<string, number>> = Readonly<Record<string, number>>> = {
    readonly owner: string;
    readonly name: string;
    readonly version: number;
    readonly axis: NativeContainerAxis;
    readonly buckets: B;
};
export type NativeContainerDefinition<Bucket extends string = string> = {
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
export type NativeContainerBucket<D extends NativeContainerDefinition> = D["buckets"][number]["name"] | "unmeasured";
export type NativeContainerValues<D extends NativeContainerDefinition, V = unknown> = Readonly<Record<NativeContainerBucket<D>, V>>;
export type ExactContainerValues<D extends NativeContainerDefinition, V> = V & {
    [K in Exclude<keyof V, NativeContainerBucket<D>>]: never;
};
export type AdmittedContainerValues<D extends NativeContainerDefinition, V> = Readonly<V> & {
    readonly [valuesBrand]: D;
};
export type NativeContainerLayout<D extends NativeContainerDefinition = NativeContainerDefinition> = {
    readonly definition: D;
    readonly onLayout: (event: LayoutChangeEvent) => void;
    readonly [layoutBrand]: D;
};
export type ContainerProviderProps<D extends NativeContainerDefinition = NativeContainerDefinition> = {
    readonly layout: NativeContainerLayout<D>;
    readonly children?: ReactNode;
};

import type {UnbrandedThemeLiteral,LegacyNativeThemeVar,DomainThemeVar} from '../../../packages/css/src/theme-token';
declare const legacy:LegacyNativeThemeVar;declare const domain:DomainThemeVar<{kind:'color'}>;
const a:UnbrandedThemeLiteral=legacy;const b:UnbrandedThemeLiteral=domain;
function one<const T>(v:T & (NoInfer<T> extends UnbrandedThemeLiteral?unknown:never)){}one(legacy);one(domain);
function two<const T extends UnbrandedThemeLiteral>(v:T & (NoInfer<T> extends UnbrandedThemeLiteral?unknown:never)){}two(legacy);two(domain);

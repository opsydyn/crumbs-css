# Experimental background image native acceptance gate

Status: **iOS native gate passed; Android qualification remains parked**.

M2.2bc admits a deliberately canonical static subset of React Native's `experimental_backgroundImage` object contract. The compiler accepts view/text linear and radial gradient arrays with explicit direction, shape, size and position, literal colour strings, finite colour-stop positions and transition hints between two colour stops. The JavaScript compiler and Effect Schema gates are complete; this document defines the native rendering gate that must remain open before the gradient contract is treated as cross-platform qualified.

The gate must run the packed Crumbs consumer on a dedicated iOS simulator first, with Android still parked under the repository roadmap policy. Exercise light and dark themes and capture direct native screenshots for:

- a linear gradient with a direction keyword and an angle;
- a radial circle and ellipse with extent and explicit x/y sizes;
- mixed colour-stop positions and a valid transition hint;
- multiple background layers and an empty-list replacement;
- transparent and opaque literal colour strings.

Record the exact package artifact, source revision, Expo/RN versions, device identity, native CSS parsing setting, screenshots and any processor or native rendering differences. A successful JavaScript bundle, a parsed style object or a host benchmark does not close this gate. Opaque platform colour symbols, token references, implicit parser defaults, unsupported units and Android rendering remain outside this qualification until they receive a separate decision and evidence.

## Recorded run

- Packed artifact: `opsydyn-crumbs-css-0.1.2-alpha.2.tgz`, SHA-256 `004965fffd13fd59290f60fb99c4b82f0f653b2cc61511c66451ba8a673a101a`
- Crumbs source revision: `584cdd78aaddd8da244506971f6869ebe970aad7` (`584cdd7` in the packed consumer receipt); the acceptance panel was present in the working tree during the run
- Consumer: packed mode, Expo SDK `56.0.22`, Expo Go `56.0.4`, React Native `0.85.3`, React `19.2.5`
- Device: dedicated `Crumbs Acceptance` iPhone 17, UDID `BA031750-0722-4DCC-87AE-EC8EE894FB1B`, iOS `26.5`
- Native CSS parsing: no override was configured; the default React Native style processor consumed the emitted `StyleSheet` values, with Crumbs `nativeStyles.strictDiagnostics=true`

The direct simulator run rendered both linear cases, the radial circle extent, the explicit radial x/y footprint, mixed stops with a transparent colour and transition hint, layered backgrounds, and the empty-list replacement in light and dark themes. The explicit radial x/y size is visibly confined to its bottom-right positioned footprint; transparent stop regions expose the underlying surface as expected. No runtime error overlay or native crash occurred. The empty list removed the layered background while retaining the card's other layout/text behaviour.

Direct simulator captures:

- [light upper cases](light-top.png) · [light layered lower cases](light-lower-layered.png) · [light empty replacement](light-lower-empty.png)
- [dark upper cases](dark-top.png) · [dark layered lower cases](dark-lower-layered.png) · [dark empty replacement](dark-lower-empty.png)

All captures are 1206 × 2622 PNGs. Their SHA-256 values are retained in the M2.2bd qualification record.

# Experimental background image native acceptance gate

Status: **pending native execution**.

M2.2bc admits a deliberately canonical static subset of React Native's `experimental_backgroundImage` object contract. The compiler accepts view/text linear and radial gradient arrays with explicit direction, shape, size and position, literal colour strings, finite colour-stop positions and transition hints between two colour stops. The JavaScript compiler and Effect Schema gates are complete; this document defines the native rendering gate that must remain open before the gradient contract is treated as cross-platform qualified.

The gate must run the packed Crumbs consumer on a dedicated iOS simulator first, with Android still parked under the repository roadmap policy. Exercise light and dark themes and capture direct native screenshots for:

- a linear gradient with a direction keyword and an angle;
- a radial circle and ellipse with extent and explicit x/y sizes;
- mixed colour-stop positions and a valid transition hint;
- multiple background layers and an empty-list replacement;
- transparent and opaque literal colour strings.

Record the exact package artifact, source revision, Expo/RN versions, device identity, native CSS parsing setting, screenshots and any processor or native rendering differences. A successful JavaScript bundle, a parsed style object or a host benchmark does not close this gate. Opaque platform colour symbols, token references, implicit parser defaults, unsupported units and Android rendering remain outside this qualification until they receive a separate decision and evidence.

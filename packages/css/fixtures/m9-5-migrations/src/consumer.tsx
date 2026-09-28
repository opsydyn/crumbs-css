import { tokens as palette } from "../tokens-v1.css";
import { button as baseRecipe } from "../button.css";
import { useThemedStyles as useStyles } from "@opsydyn/crumbs-css/theme/core";
import { createComponentRecipeResolver as createResolver } from "@opsydyn/crumbs-css/theme";

const accent = palette.color.accent;
const themed = useStyles({ baseRecipe });
const resolver = createResolver(themed.baseRecipe);
const result = resolver({});
export const consumerStyles = { accent, root: result.root, label: result.label };

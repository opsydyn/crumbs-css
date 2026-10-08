export type LocalCardValues = {
  readonly accent?: string;
  readonly alpha?: number;
};
export type LocalCards = {
  readonly a: LocalCardValues;
  readonly b: LocalCardValues;
};
export function initialLocalCards(): LocalCards { return { a: { accent: "#2457d6", alpha: .25 }, b: { accent: "#c42f73", alpha: .75 } }; }
export function updateLocalCardA(state: LocalCards, action: "opacity" | "accent-clear" | "clear"): LocalCards {
  const a = action === "clear" ? {} : action === "accent-clear" ? (state.a.alpha === undefined ? {} : { alpha: state.a.alpha }) : { ...state.a, alpha: .5 };
  return { a, b: state.b };
}

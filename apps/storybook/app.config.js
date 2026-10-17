// SDK58 keeps Babel as the control; Expo chooses actual per-file Rust/fallback routing.
module.exports = ({ config }) => {
  const worker = process.env.CRUMBS_METRO_WORKER ?? "babel"
  if (worker !== "babel" && worker !== "rust") {
    throw new Error("CRUMBS_METRO_WORKER must be babel or rust")
  }
  return {
    ...config,
    experiments: { ...config.experiments, ...(worker === "rust" ? { noxcturnalTransformWorker: true } : {}) },
  }
}

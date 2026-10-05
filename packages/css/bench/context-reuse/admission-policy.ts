/** Private qualification policy. Callers commit plans only after resource success. */
export type AdmissionSettings = Readonly<{ capacity: number; admission: "immediate" | "repeat" }>;
export type AdmissionState = Readonly<{ settings: AdmissionSettings; retained: readonly string[]; probation: readonly string[] }>;
export type AdmissionPlan = Readonly<{ kind: "fresh" | "reuse" | "create"; key: string; evict?: string; onSuccess: AdmissionState }>;

function snapshot(settings: AdmissionSettings, retained: readonly string[], probation: readonly string[]): AdmissionState {
  return Object.freeze({
    settings: Object.freeze({ capacity: settings.capacity, admission: settings.admission }),
    retained: Object.freeze([...retained]), probation: Object.freeze([...probation]),
  });
}
function validateKey(key: string): void {
  if (typeof key !== "string" || key.length === 0) throw new TypeError("Admission key must be a non-empty string");
}
export function createAdmissionState(settings: AdmissionSettings): AdmissionState {
  if (!settings || !Number.isSafeInteger(settings.capacity) || settings.capacity <= 0 || !Number.isSafeInteger(2 * settings.capacity)) {
    throw new RangeError("Admission capacity and twice capacity must be positive safe integers");
  }
  if (settings.admission !== "immediate" && settings.admission !== "repeat") throw new TypeError("Unknown admission mode");
  return snapshot(settings, [], []);
}
export function planAdmission(state: AdmissionState, key: string): AdmissionPlan {
  validateKey(key);
  const { settings, retained, probation } = state;
  if (retained.includes(key)) {
    return Object.freeze({ kind: "reuse", key, onSuccess: snapshot(settings, [...retained.filter(item => item !== key), key], probation) });
  }
  if (settings.admission === "repeat" && !probation.includes(key)) {
    return Object.freeze({ kind: "fresh", key, onSuccess: snapshot(settings, retained, [...probation, key].slice(-2 * settings.capacity)) });
  }
  const evict = retained.length === settings.capacity ? retained[0] : undefined;
  return Object.freeze({ kind: "create", key, ...(evict === undefined ? {} : { evict }),
    onSuccess: snapshot(settings, [...retained.slice(evict === undefined ? 0 : 1), key], probation.filter(item => item !== key)),
  });
}
export function forgetAdmissionKey(state: AdmissionState, key: string): AdmissionState {
  validateKey(key);
  return snapshot(state.settings, state.retained.filter(item => item !== key), state.probation.filter(item => item !== key));
}
export function clearAdmissionState(state: AdmissionState): AdmissionState {
  return snapshot(state.settings, [], []);
}

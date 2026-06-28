// Lightweight collision-resistant id generator. Avoids dependency on crypto.randomUUID
// for older browsers while still using it when available.
export function uid(prefix = ""): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 6);
  const ts = Date.now().toString(36);
  return `${prefix ? prefix + "_" : ""}${ts}_${rnd}`;
}

export function now(): number {
  return Date.now();
}

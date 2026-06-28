// Lightweight {{path.to.value}} interpolator. Supports nested fields and arrays
// (joined with commas). Missing keys collapse to empty strings.
export function interpolate(
  template: string,
  ctx: Record<string, unknown>
): string {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, path: string) => {
    const v = path.split(".").reduce<unknown>((acc, key) => {
      if (acc && typeof acc === "object" && key in (acc as object)) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, ctx);
    if (v == null) return "";
    if (Array.isArray(v)) return v.join(", ");
    return String(v);
  });
}

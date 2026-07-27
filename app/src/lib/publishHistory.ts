export function sanitizeHistoryEntry(entry: unknown): any | null {
  if (!entry || typeof entry !== "object") return null;

  const e = entry as Record<string, unknown>;

  if (typeof e.slug === "string" && (e.slug === "[slug]" || e.slug.includes("[slug]"))) {
    return null;
  }
  if (typeof e.url === "string" && e.url.includes("[slug]")) {
    return null;
  }

  const cleaned = { ...e };

  if (typeof cleaned.url === "string") {
    cleaned.url = cleaned.url
      .replace(/^https:\/\/https:\/\//, "https://")
      .replace(/\/app\/blog\//g, "/blog/");
  }

  return cleaned;
}

export function getPublishHistory(): any[] {
  try {
    const raw = localStorage.getItem("aicw.publish.history");
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const cleaned = parsed.map(sanitizeHistoryEntry).filter((e): e is any => e !== null);

    if (cleaned.length !== parsed.length) {
      localStorage.setItem("aicw.publish.history", JSON.stringify(cleaned));
    }

    return cleaned;
  } catch {
    return [];
  }
}

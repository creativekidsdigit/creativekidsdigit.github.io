// Generic CSV importer.
//
// One importer; every platform. The user picks a CSV file, the importer
// reads the headers, suggests a column-to-metric mapping based on
// fuzzy header-name matching, the user adjusts if needed, and we
// produce one PerformanceSnapshot per row.
//
// Platform-specific shortcuts (Pinterest, Payhip, ConvertKit, GA)
// can be added later as separate Importer files that pre-fill the
// mapping for known header sets — without touching the UI or this
// module.

import { parseCsvAsRecords } from "../csvParse";
import type {
  ImportContext,
  ImportPreview,
  ImportRowOutcome,
  Importer,
  ImporterSetup,
  MappableField,
} from "./types";

/**
 * Header name → MappableField guesses. Match is case-insensitive,
 * substring-based, and order matters (first match wins). Most common
 * variants across Pinterest / Payhip / ConvertKit / GA are covered.
 */
const HEADER_HINTS: { needle: string; field: MappableField }[] = [
  // Date variants first so they don't get eaten by other rules.
  { needle: "date", field: "date" },
  { needle: "day", field: "date" },
  { needle: "period", field: "date" },
  // Metrics — order from "most specific" to "least"
  { needle: "outbound click", field: "clicks" },
  { needle: "pin click", field: "clicks" },
  { needle: "link click", field: "clicks" },
  { needle: "click", field: "clicks" },
  { needle: "impression", field: "impressions" },
  { needle: "view", field: "impressions" },
  { needle: "reach", field: "impressions" },
  { needle: "engagement", field: "saves" },
  { needle: "save", field: "saves" },
  { needle: "pinned", field: "saves" },
  { needle: "share", field: "shares" },
  { needle: "comment", field: "comments" },
  { needle: "open", field: "emailOpens" },
  { needle: "session", field: "websiteVisits" },
  { needle: "user", field: "websiteVisits" },
  { needle: "visit", field: "websiteVisits" },
  { needle: "product page", field: "productPageVisits" },
  // Sales / revenue — also distinguish revenue from cost.
  { needle: "refund", field: "revenue" }, // signed
  { needle: "earn", field: "revenue" },
  { needle: "revenue", field: "revenue" },
  { needle: "sale total", field: "revenue" },
  { needle: "amount", field: "revenue" },
  { needle: "total", field: "revenue" },
  { needle: "gross", field: "revenue" },
  { needle: "order", field: "sales" },
  { needle: "transaction", field: "sales" },
  { needle: "purchase", field: "sales" },
  { needle: "sale", field: "sales" },
  { needle: "conversion", field: "sales" },
  { needle: "spend", field: "cost" },
  { needle: "cost", field: "cost" },
  { needle: "budget", field: "cost" },
  { needle: "note", field: "notes" },
  { needle: "comment", field: "notes" }, // fallback if not already mapped
];

/** Guess a field for a given header, falling back to "ignore". */
function guessMapping(header: string): MappableField {
  const h = header.trim().toLowerCase();
  if (!h) return "ignore";
  for (const { needle, field } of HEADER_HINTS) {
    if (h.includes(needle)) return field;
  }
  return "ignore";
}

/**
 * Parse a date string into an ISO `yyyy-mm-dd`. Returns null on failure.
 *
 * Supported shapes:
 *   - 2026-08-15 (ISO date)
 *   - 2026-08-15T12:34:56Z (ISO datetime — we slice the date part)
 *   - 8/15/2026 or 08/15/2026 (US m/d/y)
 *   - 15/08/2026 (D/M/Y — ambiguous with US; if year is in the third slot
 *     and the first slot > 12, we treat it as D/M/Y)
 *   - 15 Aug 2026 / Aug 15, 2026 (Date.parse fallback)
 */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // ISO: yyyy-mm-dd[T...]
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    const [, y, m, d] = iso;
    return validate(y, m, d);
  }

  // Slash-separated: m/d/y or d/m/y
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (slash) {
    let [, a, b, y] = slash;
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (na > 12 && nb <= 12) {
      // First slot > 12 means it's the day.
      return validate(y, String(nb).padStart(2, "0"), String(na).padStart(2, "0"));
    }
    // Default to US m/d/y.
    return validate(y, String(na).padStart(2, "0"), String(nb).padStart(2, "0"));
  }

  // Fallback to Date.parse — handles "Aug 15, 2026" etc.
  const ms = Date.parse(s);
  if (!Number.isNaN(ms)) {
    return new Date(ms).toISOString().slice(0, 10);
  }
  return null;
}

function validate(y: string, m: string, d: string): string | null {
  const ny = parseInt(y, 10);
  const nm = parseInt(m, 10);
  const nd = parseInt(d, 10);
  if (ny < 1900 || ny > 2200) return null;
  if (nm < 1 || nm > 12) return null;
  if (nd < 1 || nd > 31) return null;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/**
 * Parse a numeric string, tolerating common formats:
 *   - "1,234.56" — thousands separator
 *   - "$19.99" — currency prefix
 *   - "12%" — percentage suffix (returned as the number, not divided)
 *   - "1.2K" — k/m/b suffix → multiplied
 *   - "" — returns 0
 *
 * Returns 0 on unparseable strings. This is deliberately permissive
 * because real CSV exports are messy.
 */
export function parseNumber(raw: string): number {
  if (!raw) return 0;
  let s = raw.trim();
  if (!s) return 0;
  // Strip leading currency symbols and commas.
  s = s.replace(/^[\s$€£¥]+/, "").replace(/,/g, "");
  // K / M / B suffix
  let mul = 1;
  const m = /^([\d.]+)\s*([kmbKMB])$/.exec(s);
  if (m) {
    s = m[1];
    const suffix = m[2].toLowerCase();
    mul = suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : 1_000_000_000;
  }
  // Strip trailing percent — keep the raw number value, the platform
  // dashboard already shows percents as percents.
  s = s.replace(/%$/, "");
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return n * mul;
}

/** ---------- Importer ---------- */

interface GenericCsvSetup extends ImporterSetup {
  raw: {
    rows: Record<string, string>[];
  };
}

export const genericCsvImporter: Importer = {
  id: "generic-csv",
  label: "CSV file (any platform)",
  description:
    "Upload any CSV export — Pinterest, Payhip, ConvertKit, Google Analytics, or a custom file. The app guesses how columns map to metrics; you can adjust before saving.",
  scope: "campaign",
  accept: [".csv", ".tsv", ".txt"],

  async inspect(fileText) {
    const { headers, rows } = parseCsvAsRecords(fileText);
    const suggestedMapping: Record<string, MappableField> = {};
    // First pass: greedy match per header. Later we deduplicate so the
    // same MappableField isn't assigned to two headers (the second
    // match falls back to "ignore").
    const seen = new Set<MappableField>();
    for (const h of headers) {
      const guess = guessMapping(h);
      if (guess !== "ignore" && seen.has(guess)) {
        suggestedMapping[h] = "ignore";
      } else {
        suggestedMapping[h] = guess;
        if (guess !== "ignore") seen.add(guess);
      }
    }
    const setup: GenericCsvSetup = {
      headers,
      suggestedMapping,
      sample: rows.slice(0, 5),
      raw: { rows },
    };
    return setup;
  },

  async preview(setup, ctx) {
    const { raw, suggestedMapping } = setup as GenericCsvSetup;
    // Build a reverse map: MappableField → header that maps to it.
    const fieldToHeader: Partial<Record<MappableField, string>> = {};
    for (const [header, field] of Object.entries(suggestedMapping)) {
      if (field !== "ignore") fieldToHeader[field as MappableField] = header;
    }
    const dateHeader = fieldToHeader.date;
    const existingDates = new Set(
      ctx.existingSnapshots.map((s) => s.date)
    );

    const rows: ImportRowOutcome[] = [];
    let okCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const r of raw.rows) {
      if (!dateHeader) {
        rows.push({
          kind: "error",
          reason: "No column is mapped to 'Date'. Pick a date column above.",
          rawRow: r,
        });
        errorCount++;
        continue;
      }
      const dateStr = parseDate(r[dateHeader] ?? "");
      if (!dateStr) {
        rows.push({
          kind: "error",
          reason: `Could not parse the date "${r[dateHeader]}". Skip this row or fix the source.`,
          rawRow: r,
        });
        errorCount++;
        continue;
      }
      // Build a draft snapshot from the mapped columns.
      const num = (f: MappableField) => {
        const h = fieldToHeader[f];
        if (!h) return 0;
        return parseNumber(r[h] ?? "");
      };
      const notesHeader = fieldToHeader.notes;
      const draft = {
        campaignId: ctx.campaignId,
        date: dateStr,
        impressions: Math.max(0, num("impressions")),
        clicks: Math.max(0, num("clicks")),
        saves: Math.max(0, num("saves")),
        shares: Math.max(0, num("shares")),
        comments: Math.max(0, num("comments")),
        emailOpens: Math.max(0, num("emailOpens")),
        emailClicks: Math.max(0, num("emailClicks")),
        websiteVisits: Math.max(0, num("websiteVisits")),
        productPageVisits: Math.max(0, num("productPageVisits")),
        sales: Math.max(0, num("sales")),
        // Revenue and cost intentionally NOT clamped — refunds and
        // accounting adjustments are valid signed values per the
        // PR #55 design.
        revenue: num("revenue"),
        cost: num("cost"),
        notes: notesHeader ? (r[notesHeader] ?? "").trim() : "",
      };
      if (existingDates.has(dateStr)) {
        rows.push({
          kind: "skip",
          snapshot: draft,
          reason: `A snapshot for ${dateStr} already exists. Will be skipped by default to avoid double-counting.`,
        });
        skipCount++;
      } else {
        rows.push({ kind: "ok", snapshot: draft });
        okCount++;
      }
    }

    return { rows, okCount, skipCount, errorCount };
  },
};

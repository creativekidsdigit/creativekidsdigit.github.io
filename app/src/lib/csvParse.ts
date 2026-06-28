// Tiny, dependency-free CSV parser.
//
// Goals:
//   - Handle the CSV exports the user is likely to feed in: Pinterest,
//     Payhip, ConvertKit, Google Analytics, generic spreadsheet exports.
//   - Tolerate the real-world variations: quoted fields, commas inside
//     quoted fields, escaped quotes (""), CRLF or LF line endings, a UTF-8
//     BOM at the start, blank lines, trailing newlines.
//   - Stay small. ~80 LOC. No dependencies.
//
// Non-goals:
//   - Streaming. We expect inputs in the kilobytes-to-low-megabytes range
//     (a CSV export of one year of one campaign).
//   - Full RFC 4180 nuance — we don't preserve quoted-vs-unquoted
//     distinctions or surface validation errors per cell. Empty fields
//     are returned as empty strings.

/** Parse a CSV string into an array of row arrays. */
export function parseCsv(text: string): string[][] {
  // Strip a UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          // Escaped quote inside a quoted field.
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    // Not in quotes.
    if (c === '"') {
      // A quote at the start of a field opens a quoted field. A quote
      // mid-field is treated as a literal — we're forgiving here.
      if (field.length === 0) {
        inQuotes = true;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      // Treat \r\n as a single line ending.
      if (text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  // Push the last field/row if the file didn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop trailing empty rows (a common artifact of "trailing newline" files).
  while (
    rows.length > 0 &&
    rows[rows.length - 1].every((c) => c.trim() === "")
  ) {
    rows.pop();
  }
  return rows;
}

/**
 * Convenience: parse a CSV and return { headers, rows } where rows are
 * objects keyed by the header row. Missing cells become empty strings.
 */
export function parseCsvAsRecords(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const raw = parseCsv(text);
  if (raw.length === 0) return { headers: [], rows: [] };
  const headers = raw[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let r = 1; r < raw.length; r++) {
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = (raw[r][c] ?? "").trim();
    }
    rows.push(obj);
  }
  return { headers, rows };
}

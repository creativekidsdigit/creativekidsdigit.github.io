// Minimal STORED-method ZIP encoder. Zero dependencies, browser-safe.
//
// Why hand-rolled: AI-generated campaign content is small (well under 1 MB
// per bundle), so DEFLATE compression buys very little versus the cost of
// adding a runtime dep. Producing a STORED ZIP is ~100 lines of well-defined
// binary layout that any ZIP reader (OS-native unzip, 7-Zip, browser File
// API) accepts without quirks.
//
// Output spec: PKZIP APPNOTE 2.0, no extensions, no Zip64, no encryption,
// stored compression only.

/* ---------- CRC-32 ---------- */

// Standard IEEE polynomial 0xEDB88320, precomputed table.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/* ---------- helpers ---------- */

const enc = new TextEncoder();

function strToBytes(s: string): Uint8Array {
  return enc.encode(s);
}

function writeU16(view: DataView, off: number, v: number) {
  view.setUint16(off, v, /* littleEndian */ true);
}
function writeU32(view: DataView, off: number, v: number) {
  view.setUint32(off, v, /* littleEndian */ true);
}

/* ---------- public types ---------- */

export interface ZipEntryInput {
  /** Path inside the archive. Forward-slash separated. */
  path: string;
  /** File contents. Strings are UTF-8 encoded. */
  data: string | Uint8Array;
}

/* ---------- encoder ---------- */

/**
 * Produce a STORED-method ZIP archive from a list of entries.
 * Entries are written in order. Returns the raw bytes.
 *
 * Empty `entries` produces a valid empty ZIP (just an End-of-Central-Directory
 * record), which is what every spec-compliant reader expects.
 */
export function createZip(entries: readonly ZipEntryInput[]): Uint8Array {
  // Per-entry record we accumulate for the central directory.
  interface Record {
    pathBytes: Uint8Array;
    data: Uint8Array;
    crc: number;
    localHeaderOffset: number;
  }
  const records: Record[] = [];
  const chunks: Uint8Array[] = [];
  let offset = 0;

  // ----- Local file headers + file data -----
  for (const e of entries) {
    const pathBytes = strToBytes(e.path);
    const data =
      typeof e.data === "string" ? strToBytes(e.data) : e.data;
    const crc = crc32(data);

    const header = new Uint8Array(30 + pathBytes.length);
    const v = new DataView(header.buffer);
    writeU32(v, 0, 0x04034b50); // local file header signature
    writeU16(v, 4, 20); // version needed to extract
    writeU16(v, 6, 0); // general purpose bit flag
    writeU16(v, 8, 0); // compression method (0 = STORED)
    writeU16(v, 10, 0); // last mod file time
    writeU16(v, 12, 0); // last mod file date
    writeU32(v, 14, crc); // crc-32
    writeU32(v, 18, data.length); // compressed size
    writeU32(v, 22, data.length); // uncompressed size
    writeU16(v, 26, pathBytes.length); // file name length
    writeU16(v, 28, 0); // extra field length
    header.set(pathBytes, 30);

    records.push({
      pathBytes,
      data,
      crc,
      localHeaderOffset: offset,
    });
    chunks.push(header);
    chunks.push(data);
    offset += header.length + data.length;
  }

  // ----- Central directory -----
  const centralDirOffset = offset;
  for (const r of records) {
    const cd = new Uint8Array(46 + r.pathBytes.length);
    const v = new DataView(cd.buffer);
    writeU32(v, 0, 0x02014b50); // central file header signature
    writeU16(v, 4, 20); // version made by
    writeU16(v, 6, 20); // version needed
    writeU16(v, 8, 0); // bit flag
    writeU16(v, 10, 0); // compression method
    writeU16(v, 12, 0); // mod time
    writeU16(v, 14, 0); // mod date
    writeU32(v, 16, r.crc); // crc
    writeU32(v, 20, r.data.length); // compressed size
    writeU32(v, 24, r.data.length); // uncompressed size
    writeU16(v, 28, r.pathBytes.length); // file name length
    writeU16(v, 30, 0); // extra field length
    writeU16(v, 32, 0); // file comment length
    writeU16(v, 34, 0); // disk number start
    writeU16(v, 36, 0); // internal file attributes
    writeU32(v, 38, 0); // external file attributes
    writeU32(v, 42, r.localHeaderOffset); // local header offset
    cd.set(r.pathBytes, 46);

    chunks.push(cd);
    offset += cd.length;
  }
  const centralDirSize = offset - centralDirOffset;

  // ----- End of central directory record -----
  const eocd = new Uint8Array(22);
  {
    const v = new DataView(eocd.buffer);
    writeU32(v, 0, 0x06054b50); // EOCD signature
    writeU16(v, 4, 0); // number of this disk
    writeU16(v, 6, 0); // disk where CD starts
    writeU16(v, 8, records.length); // entries on this disk
    writeU16(v, 10, records.length); // total entries
    writeU32(v, 12, centralDirSize); // size of central directory
    writeU32(v, 16, centralDirOffset); // offset of central directory
    writeU16(v, 20, 0); // comment length
  }
  chunks.push(eocd);
  offset += eocd.length;

  // ----- Combine -----
  const out = new Uint8Array(offset);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

/* ---------- minimal reader (for tests) ---------- */

export interface ZipEntryOutput {
  path: string;
  data: Uint8Array;
  crc: number;
}

/**
 * Inverse of createZip — reads local file headers in sequence and returns
 * the entries. Used by the smoke test suite to confirm round-trip integrity.
 * Not intended as a general ZIP reader (does not handle Zip64, compression,
 * encryption, or non-sequential local-header ordering).
 */
export function readStoredZip(bytes: Uint8Array): ZipEntryOutput[] {
  const out: ZipEntryOutput[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dec = new TextDecoder();
  let off = 0;
  while (off + 30 <= bytes.length) {
    const sig = view.getUint32(off, true);
    if (sig !== 0x04034b50) break; // start of central directory or EOCD
    const compression = view.getUint16(off + 8, true);
    if (compression !== 0) {
      throw new Error("readStoredZip: only STORED entries are supported");
    }
    const crc = view.getUint32(off + 14, true);
    const compSize = view.getUint32(off + 18, true);
    const nameLen = view.getUint16(off + 26, true);
    const extraLen = view.getUint16(off + 28, true);
    const nameStart = off + 30;
    const dataStart = nameStart + nameLen + extraLen;
    const path = dec.decode(bytes.subarray(nameStart, nameStart + nameLen));
    const data = bytes.subarray(dataStart, dataStart + compSize);
    out.push({ path, data, crc });
    off = dataStart + compSize;
  }
  return out;
}

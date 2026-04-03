import { createReadStream } from "node:fs";
import { parse } from "csv-parse";
import { COLUMN_MAP, REQUIRED_FIELDS } from "../config.js";

export function normalizeColumnName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")       // strip parentheses
    .replace(/\s+/g, "_");      // spaces → underscores
}

function mapColumns(rawHeaders) {
  return rawHeaders.map((h) => {
    const normalized = normalizeColumnName(h);
    return COLUMN_MAP[normalized] || normalized;
  });
}

export function parseRecord(raw) {
  const record = {
    name: raw.park_name || raw.name || "",
    address: raw.address || "",
    city: raw.city || "",
    state: raw.state || "",
    zip: String(raw.zip || "").replace(/\D/g, "").padStart(5, "0"),
    county: raw.county || "",
    ownerName: raw.owner_name || raw.ownerName || "",
    ownerMailingAddress: raw.owner_mailing_address || raw.ownerMailingAddress || "",
    ownerMailingCity: raw.owner_mailing_city || raw.ownerMailingCity || "",
    ownerMailingState: raw.owner_mailing_state || raw.ownerMailingState || "",
    ownerMailingZip: raw.owner_mailing_zip || raw.ownerMailingZip || "",
    lotCount: parseIntOrNull(raw.lot_count ?? raw.lotCount),
    assessedValue: parseCurrency(raw.assessed_value ?? raw.assessedValue),
    yearBuilt: parseIntOrNull(raw.year_built ?? raw.yearBuilt),
    ownershipDate: parseDateOrNull(raw.ownership_date ?? raw.ownershipDate),
    taxStatus: (raw.tax_status || raw.taxStatus || "").toString().toLowerCase().trim() || null,
    equityPercent: parseFloatOrNull(raw.equity_percent ?? raw.equityPercent),
    mortgageAmount: parseCurrency(raw.mortgage_amount ?? raw.mortgageAmount),
    utilities: (raw.utilities || "").toString().toLowerCase().trim() || null,
    validation: [],
  };

  if (!record.name) record.validation.push("missing_name");
  if (!record.address) record.validation.push("missing_address");
  if (!record.city) record.validation.push("missing_city");
  if (!record.zip || record.zip === "00000") record.validation.push("missing_zip");
  if (!record.county) record.validation.push("missing_county");

  return record;
}

function parseIntOrNull(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = parseInt(String(val).replace(/\D/g, ""), 10);
  return isNaN(n) || n === 0 ? null : n;
}

function parseFloatOrNull(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}

function parseCurrency(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = parseFloat(String(val).replace(/[$,\s]/g, ""));
  return isNaN(n) ? null : n;
}

function parseDateOrNull(val) {
  if (val === null || val === undefined || val === "") return null;
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return null;
}

export async function ingestCSV(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];
    const parser = createReadStream(filePath).pipe(
      parse({
        columns: (headers) => mapColumns(headers),
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      })
    );

    parser.on("data", (row) => {
      records.push(parseRecord(row));
    });
    parser.on("error", reject);
    parser.on("end", () => resolve(records));
  });
}

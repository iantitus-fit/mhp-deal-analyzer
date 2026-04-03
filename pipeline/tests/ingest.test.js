import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ingestCSV, normalizeColumnName, parseRecord } from "../lib/ingest.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_CSV = join(__dirname, "../../data/mock-propstream.csv");

describe("normalizeColumnName", () => {
  it("lowercases and replaces spaces with underscores", () => {
    assert.equal(normalizeColumnName("Park Name"), "park_name");
  });

  it("strips special characters", () => {
    assert.equal(normalizeColumnName("Lot Count (#)"), "lot_count_#");
  });
});

describe("parseRecord", () => {
  it("parses lot_count as integer", () => {
    const record = parseRecord({ lot_count: "85", zip: "37914", assessed_value: "750000", city: "Knoxville", county: "Knox", park_name: "Test", address: "123 Main" });
    assert.equal(record.lotCount, 85);
  });

  it("sets null for missing lot_count", () => {
    const record = parseRecord({ lot_count: "", zip: "37914", assessed_value: "", city: "Knoxville", county: "Knox", park_name: "Test", address: "123 Main" });
    assert.equal(record.lotCount, null);
  });

  it("strips $ and commas from assessed_value", () => {
    const record = parseRecord({ assessed_value: "$1,200,000", lot_count: "50", zip: "37914", city: "Knoxville", county: "Knox", park_name: "Test", address: "123 Main" });
    assert.equal(record.assessedValue, 1200000);
  });

  it("flags missing required fields in validation array", () => {
    const record = parseRecord({ zip: "37914", lot_count: "", assessed_value: "", city: "Knoxville", county: "Knox", park_name: "", address: "123 Main" });
    assert.ok(record.validation.includes("missing_name"));
  });

  it("normalizes tax_status to lowercase", () => {
    const record = parseRecord({ tax_status: "DELINQUENT", zip: "37914", lot_count: "50", assessed_value: "500000", city: "Knoxville", county: "Knox", park_name: "Test", address: "123 Main" });
    assert.equal(record.taxStatus, "delinquent");
  });

  it("parses ownership_date to ISO string", () => {
    const record = parseRecord({ ownership_date: "2008-03-15", zip: "37914", lot_count: "50", assessed_value: "500000", city: "Knoxville", county: "Knox", park_name: "Test", address: "123 Main" });
    assert.equal(record.ownershipDate, "2008-03-15");
  });
});

describe("ingestCSV", () => {
  it("parses mock CSV and returns 30 records", async () => {
    const records = await ingestCSV(MOCK_CSV);
    assert.equal(records.length, 30);
  });

  it("first record has expected park name", async () => {
    const records = await ingestCSV(MOCK_CSV);
    assert.equal(records[0].name, "Sunrise Mobile Home Park");
  });

  it("maps column aliases correctly", async () => {
    const records = await ingestCSV(MOCK_CSV);
    assert.ok(records.every(r => typeof r.name === "string"));
    assert.ok(records.every(r => typeof r.zip === "string"));
  });
});

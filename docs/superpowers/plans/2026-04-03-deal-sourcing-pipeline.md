# MHP Deal Sourcing Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js CLI pipeline that ingests PropStream CSV, enriches with market data, scores parks against Justin Donald's framework, and outputs tiered results.

**Architecture:** Six modules under `pipeline/lib/` (ingest, enrich, score, tier, output, config) wired together by `pipeline/run.js`. Mock data in `data/mock-propstream.csv`. Output to `pipeline/output/`. Tests use Node's built-in `node:test` runner.

**Tech Stack:** Node.js (ES modules), csv-parse, Firecrawl REST API (via fetch), node:test

**Spec:** `docs/superpowers/specs/2026-04-03-deal-sourcing-pipeline-design.md`

---

### Task 1: Project scaffolding and config

**Files:**
- Create: `pipeline/config.js`
- Create: `pipeline/lib/` (directory)
- Create: `pipeline/tests/` (directory)
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Install csv-parse dependency**

```bash
npm install csv-parse
```

- [ ] **Step 2: Add pipeline script to package.json**

Add to the `"scripts"` section of `package.json`:

```json
"pipeline": "node pipeline/run.js",
"test:pipeline": "node --test pipeline/tests/*.test.js"
```

- [ ] **Step 3: Update .gitignore**

Append to `.gitignore`:

```
pipeline/output/
pipeline/.cache/
```

- [ ] **Step 4: Create pipeline/config.js**

```js
// pipeline/config.js
// Scoring thresholds, KUB service area zips, and constants

export const KUB_ZIPS = new Set([
  ...range(37901, 37924),
  ...range(37927, 37932),
  37934, 37938, 37950,
  ...range(37995, 37998),
].map(String));

function range(start, end) {
  const result = [];
  for (let i = start; i <= end; i++) result.push(i);
  return result;
}

export const THRESHOLDS = {
  MSA_POPULATION_MIN: 100_000,
  LOT_COUNT_MIN: 50,
  CAP_RATE_MIN: 0.10,
  CASH_ON_CASH_MIN: 0.20,
  SPREAD_MIN: 0.03,
  ASSUMED_INTEREST_RATE: 0.055,
  OCCUPANCY_MIN: 0.70,
  PRICE_PER_LOT_GOOD: 25_000,
  PRICE_PER_LOT_MAX: 50_000,
  UNDERVALUED_PER_LOT: 15_000,
  OWNERSHIP_YEARS_SIGNAL: 10,
  LOT_RENT_MULTIPLIER: 0.35, // 2BR rent × 0.35 ≈ lot rent
  EXPENSE_RATIO: 0.70,       // tenant-pays-utilities assumption
};

export const REQUIRED_FIELDS = ["name", "address", "city", "zip", "county"];

// Column name normalization: PropStream headers → internal field names
export const COLUMN_MAP = {
  park_name: "name",
  property_name: "name",
  site_name: "name",
  address: "address",
  street_address: "address",
  property_address: "address",
  city: "city",
  zip: "zip",
  zip_code: "zip",
  zipcode: "zip",
  postal_code: "zip",
  county: "county",
  state: "state",
  owner_name: "ownerName",
  owner: "ownerName",
  owner_mailing_address: "ownerMailingAddress",
  mailing_address: "ownerMailingAddress",
  owner_mailing_city: "ownerMailingCity",
  mailing_city: "ownerMailingCity",
  owner_mailing_state: "ownerMailingState",
  mailing_state: "ownerMailingState",
  owner_mailing_zip: "ownerMailingZip",
  mailing_zip: "ownerMailingZip",
  lot_count: "lotCount",
  lots: "lotCount",
  num_lots: "lotCount",
  units: "lotCount",
  assessed_value: "assessedValue",
  assessed: "assessedValue",
  total_assessed_value: "assessedValue",
  year_built: "yearBuilt",
  ownership_date: "ownershipDate",
  sale_date: "ownershipDate",
  last_sale_date: "ownershipDate",
  tax_status: "taxStatus",
  equity_percent: "equityPercent",
  equity: "equityPercent",
  mortgage_amount: "mortgageAmount",
  mortgage: "mortgageAmount",
  mortgage_balance: "mortgageAmount",
  utilities: "utilities",
};
```

- [ ] **Step 5: Create directory structure**

```bash
mkdir -p pipeline/lib pipeline/tests pipeline/output pipeline/.cache data
```

- [ ] **Step 6: Commit**

```bash
git add pipeline/config.js package.json package-lock.json .gitignore
git commit -m "feat: add pipeline config and project scaffolding"
```

---

### Task 2: Mock PropStream CSV

**Files:**
- Create: `data/mock-propstream.csv`

- [ ] **Step 1: Create mock-propstream.csv with 30 records**

The CSV must have these headers:
```
park_name,address,city,state,zip,county,owner_name,owner_mailing_address,owner_mailing_city,owner_mailing_state,owner_mailing_zip,lot_count,assessed_value,year_built,ownership_date,tax_status,equity_percent,mortgage_amount,utilities
```

**Distribution (30 records):**

GREEN targets (5) — 60+ lots, KUB zips, long ownership, out-of-state owner, good $/lot:
```csv
Sunrise Mobile Home Park,1200 Asheville Hwy,Knoxville,TN,37914,Knox,Smith Family Trust,456 Oak St,Columbus,OH,43215,85,750000,1978,2008-03-15,current,100,0,city
Valley View Estates,3400 N Broadway,Knoxville,TN,37917,Knox,Henderson Properties LLC,1200 Peachtree St,Atlanta,GA,30309,72,680000,1982,2006-11-20,current,85,102000,city
Cedar Ridge MHP,5500 Clinton Hwy,Knoxville,TN,37912,Knox,Westfield Investments,890 Michigan Ave,Indianapolis,IN,46204,95,900000,1975,2005-06-01,current,100,0,city
Maryville Mobile Village,2100 E Broadway Ave,Maryville,TN,37801,Blount,Lakeshore Capital Group,2500 Lake Shore Dr,Chicago,IL,60614,68,620000,1980,2012-01-10,current,90,62000,
Mountain Meadows MHP,4800 Rutledge Pike,Knoxville,TN,37918,Knox,Pacific Realty Holdings,1500 Market St,San Francisco,CA,94103,110,1200000,1972,2006-09-22,current,100,0,city
```

YELLOW targets (8) — pass hard-stops, missing data or low opportunity score:
```csv
Hillcrest Terrace,800 Merchant Dr,Knoxville,TN,37912,Knox,Johnson Family LP,200 Main St,Knoxville,TN,37902,,450000,1985,2015-04-01,current,75,112500,city
Oak Park Mobile Homes,1900 Western Ave,Knoxville,TN,37921,Knox,Patricia Morgan,1900 Western Ave,Knoxville,TN,37921,62,1100000,1990,2018-07-15,current,60,440000,city
Riverside MHP,3200 Alcoa Hwy,Maryville,TN,37804,Blount,River Holdings Inc,780 River Rd,Chattanooga,TN,37405,75,800000,1977,2009-02-28,current,100,0,
Anderson County Estates,100 Edgemoor Rd,Clinton,TN,37716,Anderson,Baker Investment Trust,3300 W End Ave,Nashville,TN,37203,58,520000,1983,2011-08-12,current,80,104000,
Pine Hills Community,600 Oak Ridge Tpke,Oak Ridge,TN,37830,Anderson,Shenandoah Properties LLC,400 King St,Alexandria,VA,22314,,680000,1979,2007-05-20,current,100,0,
Sevier Heights MHP,1500 Dolly Parton Pkwy,Sevierville,TN,37862,Sevier,Mountain Investments LLC,900 Broadway,Lexington,KY,40507,55,490000,1988,2014-03-25,current,70,147000,
Lakewood Village,2800 Middlebrook Pike,Knoxville,TN,37921,Knox,Tanaka Holdings Corp,1-2-3 Shibuya,Tokyo,,100-0005,65,580000,1981,2004-12-01,current,100,0,city
Smoky View Estates,900 Winfield Dunn Pkwy,Sevierville,TN,37876,Sevier,Evergreen Trust,PO Box 445,Knoxville,TN,37901,,720000,1974,2010-11-30,current,90,72000,
```

GRAY targets (10) — under 50 lots:
```csv
Small Pines MHP,400 Tazewell Pike,Knoxville,TN,37918,Knox,Robert Chen,400 Tazewell Pike,Knoxville,TN,37918,25,180000,1985,2019-06-01,current,50,90000,city
Cozy Corner MHP,150 Loves Creek Rd,Knoxville,TN,37922,Knox,Maria Santos,150 Loves Creek Rd,Knoxville,TN,37922,18,120000,1990,2020-03-15,current,40,72000,city
Blount Mini Park,300 Foothills Mall Dr,Maryville,TN,37801,Blount,Tom Williams,300 Foothills Mall Dr,Maryville,TN,37801,30,210000,1987,2017-09-10,current,65,73500,
Farragut Homes,500 Campbell Station Rd,Knoxville,TN,37934,Knox,Linda Park,500 Campbell Station Rd,Knoxville,TN,37934,22,195000,1992,2021-01-20,current,30,136500,city
Anderson Mini MHP,200 Main St,Clinton,TN,37716,Anderson,James Wilson,200 Main St,Clinton,TN,37716,35,165000,1980,2016-04-15,current,100,0,
Sevier Pocket Park,250 Forks of the River Pkwy,Sevierville,TN,37862,Sevier,Nancy Taylor,250 Forks of River Pkwy,Sevierville,TN,37862,15,95000,1995,2022-08-01,current,20,76000,
Karns Mobile Court,200 Byington Solway Rd,Knoxville,TN,37931,Knox,David Brown,200 Byington Solway Rd,Knoxville,TN,37931,40,280000,1984,2013-05-22,current,75,70000,city
Powell Pines,100 Emory Rd,Knoxville,TN,37938,Knox,Sarah Mitchell,6700 Baum Dr,Knoxville,TN,37919,45,320000,1979,2002-11-01,current,100,0,city
Townsend Tiny Village,500 Lamar Alexander Pkwy,Townsend,TN,37882,Blount,Jeff Adams,500 Lamar Alexander Pkwy,Townsend,TN,37882,12,80000,1998,2023-02-14,current,10,72000,
Halls Crossroads MHP,300 Maynardville Pike,Knoxville,TN,37918,Knox,Karen White,300 Maynardville Pike,Knoxville,TN,37918,42,300000,1986,2015-07-30,current,55,135000,city
```

RED targets (7) — hard-stop failures:
```csv
Dalton Acres MHP,800 Chattanooga Rd,Dalton,GA,30720,Whitfield,Georgia Investments LLC,800 Chattanooga Rd,Dalton,GA,30720,65,420000,1976,2008-04-10,current,100,0,city
North Georgia Pines,200 Cleveland Hwy,Dalton,GA,30721,Whitfield,Peach State Holdings,200 Cleveland Hwy,Dalton,GA,30721,50,380000,1982,2010-07-15,current,80,76000,city
London KY Mobile Park,400 N Main St,London,KY,40741,Laurel,Bluegrass Rentals LLC,400 N Main St,London,KY,40741,55,290000,1979,2007-09-01,current,100,0,city
Williamsburg Estates,600 US-25W,Williamsburg,KY,40769,Whitley,Mountain Realty Inc,600 US-25W,Williamsburg,KY,40769,45,195000,1981,2005-12-20,delinquent,100,0,well
Lagoon Creek MHP,900 Ball Camp Pike,Knoxville,TN,37921,Knox,Old Timer Properties,900 Ball Camp Pike,Knoxville,TN,37921,60,350000,1970,2001-03-15,delinquent,100,0,lagoon
Well Springs Park,1100 Middlebrook Pike,Knoxville,TN,37921,Knox,Retired Farmer Trust,PO Box 100,Knoxville,TN,37901,55,280000,1968,1998-06-01,current,100,0,well
KY Border Park,100 Cumberland Gap Pkwy,Harrogate,TN,37752,Claiborne,Border Holdings LLC,100 Cumberland Gap Pkwy,Middlesboro,KY,40965,70,310000,1975,2003-08-20,delinquent,100,0,septic
```

- [ ] **Step 2: Verify CSV has 30 rows**

```bash
wc -l data/mock-propstream.csv
# Expected: 31 (1 header + 30 data rows)
```

- [ ] **Step 3: Commit**

```bash
git add data/mock-propstream.csv
git commit -m "feat: add 30-record mock PropStream CSV for pipeline validation"
```

---

### Task 3: Ingest module

**Files:**
- Create: `pipeline/lib/ingest.js`
- Create: `pipeline/tests/ingest.test.js`

- [ ] **Step 1: Write failing tests for ingest**

```js
// pipeline/tests/ingest.test.js
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
    // park_name column should map to record.name
    assert.ok(records.every(r => typeof r.name === "string"));
    assert.ok(records.every(r => typeof r.zip === "string"));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
node --test pipeline/tests/ingest.test.js
```
Expected: FAIL (module not found)

- [ ] **Step 3: Implement ingest.js**

```js
// pipeline/lib/ingest.js
import { createReadStream } from "node:fs";
import { parse } from "csv-parse";
import { COLUMN_MAP, REQUIRED_FIELDS } from "../config.js";

export function normalizeColumnName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "_");
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

  // Validate required fields
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
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // Try MM/DD/YYYY
  const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Try to parse with Date
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node --test pipeline/tests/ingest.test.js
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add pipeline/lib/ingest.js pipeline/tests/ingest.test.js
git commit -m "feat: add CSV ingest module with column normalization and validation"
```

---

### Task 4: Score module

**Files:**
- Create: `pipeline/lib/score.js`
- Create: `pipeline/tests/score.test.js`

- [ ] **Step 1: Write failing tests for scoring**

```js
// pipeline/tests/score.test.js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreHardStops, scoreNegotiable, scoreOpportunities } from "../lib/score.js";

describe("scoreHardStops", () => {
  it("auto-passes legal state for TN", () => {
    const result = scoreHardStops(
      { state: "TN", zip: "37914", county: "Knox", lotCount: 85, utilities: "city" },
      { msaPopulation: "893,690" }
    );
    assert.equal(result.legalState.score, "PASS");
  });

  it("fails legal state for GA", () => {
    const result = scoreHardStops(
      { state: "GA", zip: "30720", county: "Whitfield", lotCount: 65, utilities: "city" },
      { msaPopulation: "200,000" }
    );
    assert.equal(result.legalState.score, "FAIL");
  });

  it("passes MSA >= 100K", () => {
    const result = scoreHardStops(
      { state: "TN", zip: "37914", county: "Knox", lotCount: 85, utilities: "city" },
      { msaPopulation: "893,690" }
    );
    assert.equal(result.msaPopulation.score, "PASS");
  });

  it("fails MSA < 100K", () => {
    const result = scoreHardStops(
      { state: "TN", zip: "37752", county: "Claiborne", lotCount: 70, utilities: "city" },
      { msaPopulation: "45,000" }
    );
    assert.equal(result.msaPopulation.score, "FAIL");
  });

  it("UNKNOWN MSA when no market data", () => {
    const result = scoreHardStops(
      { state: "TN", zip: "37914", county: "Knox", lotCount: 85, utilities: "city" },
      null
    );
    assert.equal(result.msaPopulation.score, "UNKNOWN");
  });

  it("passes lot count >= 50", () => {
    const result = scoreHardStops(
      { state: "TN", zip: "37914", county: "Knox", lotCount: 85, utilities: "city" },
      { msaPopulation: "893,690" }
    );
    assert.equal(result.lotCount.score, "PASS");
  });

  it("GRAY for lot count < 50 (score is BELOW_BUYBOX, not FAIL)", () => {
    const result = scoreHardStops(
      { state: "TN", zip: "37914", county: "Knox", lotCount: 25, utilities: "city" },
      { msaPopulation: "893,690" }
    );
    assert.equal(result.lotCount.score, "BELOW_BUYBOX");
  });

  it("UNKNOWN for missing lot count", () => {
    const result = scoreHardStops(
      { state: "TN", zip: "37914", county: "Knox", lotCount: null, utilities: "city" },
      { msaPopulation: "893,690" }
    );
    assert.equal(result.lotCount.score, "UNKNOWN");
  });

  it("passes city utilities for Knox KUB zip", () => {
    const result = scoreHardStops(
      { state: "TN", zip: "37914", county: "Knox", lotCount: 85, utilities: "city" },
      { msaPopulation: "893,690" }
    );
    assert.equal(result.cityUtilities.score, "PASS");
  });

  it("FAIL for confirmed well/lagoon", () => {
    const result = scoreHardStops(
      { state: "TN", zip: "37921", county: "Knox", lotCount: 60, utilities: "lagoon" },
      { msaPopulation: "893,690" }
    );
    assert.equal(result.cityUtilities.score, "FAIL");
  });

  it("UNKNOWN for non-Knox county without utility info", () => {
    const result = scoreHardStops(
      { state: "TN", zip: "37801", county: "Blount", lotCount: 68, utilities: null },
      { msaPopulation: "893,690" }
    );
    assert.equal(result.cityUtilities.score, "UNKNOWN");
  });
});

describe("scoreNegotiable", () => {
  it("computes cap rate when data available", () => {
    const result = scoreNegotiable(
      { lotCount: 85, assessedValue: 750000 },
      { rent2BR: "1,050" }
    );
    // estimated rent = 1050 * 0.35 = 367.5
    // NOI = 85 * 367.5 * 0.70 * 12 = 262,395
    // cap = 262395 / 750000 = 0.3499 = ~35%
    assert.equal(result.capRate.score, "PASS");
  });

  it("UNKNOWN cap rate when missing assessed value", () => {
    const result = scoreNegotiable(
      { lotCount: 85, assessedValue: null },
      { rent2BR: "1,050" }
    );
    assert.equal(result.capRate.score, "UNKNOWN");
  });

  it("occupancy is always UNKNOWN", () => {
    const result = scoreNegotiable(
      { lotCount: 85, assessedValue: 750000 },
      { rent2BR: "1,050" }
    );
    assert.equal(result.occupancy.score, "UNKNOWN");
  });

  it("fewPOH is always UNKNOWN", () => {
    const result = scoreNegotiable(
      { lotCount: 85, assessedValue: 750000 },
      { rent2BR: "1,050" }
    );
    assert.equal(result.fewPOH.score, "UNKNOWN");
  });

  it("priceInRange PASS when $/lot < $25K", () => {
    const result = scoreNegotiable(
      { lotCount: 85, assessedValue: 750000 },
      { rent2BR: "1,050" }
    );
    // 750000 / 85 = $8,824/lot
    assert.equal(result.priceInRange.score, "PASS");
  });

  it("priceInRange FAIL when $/lot > $50K", () => {
    const result = scoreNegotiable(
      { lotCount: 20, assessedValue: 1200000 },
      { rent2BR: "1,050" }
    );
    // 1200000 / 20 = $60,000/lot
    assert.equal(result.priceInRange.score, "FAIL");
  });
});

describe("scoreOpportunities", () => {
  it("flags long ownership > 10 years", () => {
    const result = scoreOpportunities({ ownershipDate: "2008-03-15", ownerMailingState: "TN", taxStatus: "current", assessedValue: 750000, lotCount: 85 });
    assert.equal(result.longOwnership, true);
  });

  it("does not flag recent ownership", () => {
    const result = scoreOpportunities({ ownershipDate: "2020-01-01", ownerMailingState: "TN", taxStatus: "current", assessedValue: 750000, lotCount: 85 });
    assert.equal(result.longOwnership, false);
  });

  it("flags out-of-state owner", () => {
    const result = scoreOpportunities({ ownershipDate: "2020-01-01", ownerMailingState: "OH", taxStatus: "current", assessedValue: 750000, lotCount: 85 });
    assert.equal(result.outOfState, true);
  });

  it("flags tax delinquent", () => {
    const result = scoreOpportunities({ ownershipDate: "2020-01-01", ownerMailingState: "TN", taxStatus: "delinquent", assessedValue: 750000, lotCount: 85 });
    assert.equal(result.taxDelinquent, true);
  });

  it("flags undervalued (< $15K/lot)", () => {
    const result = scoreOpportunities({ ownershipDate: "2020-01-01", ownerMailingState: "TN", taxStatus: "current", assessedValue: 500000, lotCount: 85 });
    // 500000 / 85 = $5,882/lot
    assert.equal(result.undervalued, true);
  });

  it("computes total opportunity score", () => {
    const result = scoreOpportunities({ ownershipDate: "2005-01-01", ownerMailingState: "OH", taxStatus: "delinquent", assessedValue: 500000, lotCount: 85 });
    assert.equal(result.score, 4); // all four signals true
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
node --test pipeline/tests/score.test.js
```
Expected: FAIL (module not found)

- [ ] **Step 3: Implement score.js**

```js
// pipeline/lib/score.js
import { KUB_ZIPS, THRESHOLDS } from "../config.js";

function parsePopulation(val) {
  if (!val) return null;
  return parseInt(String(val).replace(/,/g, ""), 10) || null;
}

function parseRent(val) {
  if (!val) return null;
  return parseFloat(String(val).replace(/[$,]/g, "")) || null;
}

export function scoreHardStops(park, market) {
  const result = {};

  // 1. Legal state
  const state = (park.state || "").toUpperCase().trim();
  if (state === "TN") {
    result.legalState = { score: "PASS", detail: "TN = auto-pass" };
  } else if (state) {
    result.legalState = { score: "FAIL", detail: `${state} is not TN` };
  } else {
    result.legalState = { score: "UNKNOWN", detail: "State not provided" };
  }

  // 2 & 5. MSA population (deduplicated — one check covers both criteria)
  const msaPop = market ? parsePopulation(market.msaPopulation) : null;
  if (msaPop !== null) {
    if (msaPop >= THRESHOLDS.MSA_POPULATION_MIN) {
      result.msaPopulation = { score: "PASS", detail: `${msaPop.toLocaleString()} >= 100,000` };
    } else {
      result.msaPopulation = { score: "FAIL", detail: `${msaPop.toLocaleString()} < 100,000` };
    }
  } else {
    result.msaPopulation = { score: "UNKNOWN", detail: "No market data available" };
  }

  // 3. Lot count — never RED. <50 = BELOW_BUYBOX (→ GRAY), null = UNKNOWN (→ YELLOW)
  if (park.lotCount !== null && park.lotCount !== undefined) {
    if (park.lotCount >= THRESHOLDS.LOT_COUNT_MIN) {
      result.lotCount = { score: "PASS", detail: `${park.lotCount} >= 50` };
    } else {
      result.lotCount = { score: "BELOW_BUYBOX", detail: `${park.lotCount} < 50 — wrong buy box` };
    }
  } else {
    result.lotCount = { score: "UNKNOWN", detail: "Lot count not provided" };
  }

  // 4. City utilities
  const utilities = (park.utilities || "").toLowerCase();
  if (utilities === "well" || utilities === "lagoon" || utilities === "septic") {
    result.cityUtilities = { score: "FAIL", detail: `Confirmed: ${utilities}` };
  } else if (park.county && park.county.toLowerCase() === "knox") {
    if (KUB_ZIPS.has(park.zip)) {
      result.cityUtilities = { score: utilities === "city" ? "PASS" : "PASS", detail: `${park.zip} in KUB service area` };
    } else {
      result.cityUtilities = { score: "UNKNOWN", detail: `Knox County zip ${park.zip} not confirmed in KUB area` };
    }
  } else {
    result.cityUtilities = { score: "UNKNOWN", detail: `${park.county} County — verify utilities manually` };
  }

  return result;
}

export function scoreNegotiable(park, market) {
  const result = {};
  const rent2BR = market ? parseRent(market.rent2BR) : null;
  const estimatedLotRent = rent2BR ? rent2BR * THRESHOLDS.LOT_RENT_MULTIPLIER : null;

  // 6. Cap rate
  let impliedCapRate = null;
  if (park.lotCount && park.assessedValue && estimatedLotRent) {
    const noi = park.lotCount * estimatedLotRent * THRESHOLDS.EXPENSE_RATIO * 12;
    impliedCapRate = noi / park.assessedValue;
    if (impliedCapRate >= THRESHOLDS.CAP_RATE_MIN) {
      result.capRate = { score: "PASS", detail: `${(impliedCapRate * 100).toFixed(1)}% >= 10%` };
    } else {
      result.capRate = { score: "FAIL", detail: `${(impliedCapRate * 100).toFixed(1)}% < 10%` };
    }
  } else {
    const missing = [];
    if (!park.lotCount) missing.push("lot count");
    if (!park.assessedValue) missing.push("assessed value");
    if (!estimatedLotRent) missing.push("market rent data");
    result.capRate = { score: "UNKNOWN", detail: `Missing: ${missing.join(", ")}` };
  }

  // 7. Cash-on-cash
  if (impliedCapRate !== null) {
    const spread = impliedCapRate - THRESHOLDS.ASSUMED_INTEREST_RATE;
    if (spread >= THRESHOLDS.SPREAD_MIN) {
      result.cashOnCash = { score: "PASS", detail: `${(spread * 100).toFixed(1)}pt spread >= 3pt` };
    } else {
      result.cashOnCash = { score: "FAIL", detail: `${(spread * 100).toFixed(1)}pt spread < 3pt` };
    }
  } else {
    result.cashOnCash = { score: "UNKNOWN", detail: "Requires cap rate calculation" };
  }

  // 8. Occupancy — always unknown from PropStream
  result.occupancy = { score: "UNKNOWN", detail: "Not in PropStream data" };

  // 9. Few POH — always unknown from PropStream
  result.fewPOH = { score: "UNKNOWN", detail: "Not in PropStream data" };

  // 10. Price in range
  if (park.assessedValue && park.lotCount) {
    const perLot = park.assessedValue / park.lotCount;
    if (perLot <= THRESHOLDS.PRICE_PER_LOT_GOOD) {
      result.priceInRange = { score: "PASS", detail: `$${Math.round(perLot).toLocaleString()}/lot — good value` };
    } else if (perLot <= THRESHOLDS.PRICE_PER_LOT_MAX) {
      result.priceInRange = { score: "PASS", detail: `$${Math.round(perLot).toLocaleString()}/lot — moderate` };
    } else {
      result.priceInRange = { score: "FAIL", detail: `$${Math.round(perLot).toLocaleString()}/lot > $50K — likely overpriced` };
    }
  } else {
    result.priceInRange = { score: "UNKNOWN", detail: "Missing assessed value or lot count" };
  }

  return result;
}

export function scoreOpportunities(park) {
  const signals = {};

  // Long ownership (> 10 years)
  if (park.ownershipDate) {
    const owned = new Date(park.ownershipDate);
    const yearsAgo = new Date();
    yearsAgo.setFullYear(yearsAgo.getFullYear() - THRESHOLDS.OWNERSHIP_YEARS_SIGNAL);
    signals.longOwnership = owned <= yearsAgo;
  } else {
    signals.longOwnership = false;
  }

  // Out-of-state owner
  if (park.ownerMailingState && park.ownerMailingState.toUpperCase() !== "TN") {
    signals.outOfState = true;
  } else {
    signals.outOfState = false;
  }

  // Tax delinquent
  signals.taxDelinquent = park.taxStatus ? park.taxStatus.includes("delinquent") : false;

  // Undervalued (< $15K/lot)
  if (park.assessedValue && park.lotCount) {
    signals.undervalued = (park.assessedValue / park.lotCount) < THRESHOLDS.UNDERVALUED_PER_LOT;
  } else {
    signals.undervalued = false;
  }

  signals.score = [signals.longOwnership, signals.outOfState, signals.taxDelinquent, signals.undervalued].filter(Boolean).length;

  return signals;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node --test pipeline/tests/score.test.js
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add pipeline/lib/score.js pipeline/tests/score.test.js
git commit -m "feat: add scoring module — hard-stops, negotiable criteria, opportunity signals"
```

---

### Task 5: Tier module

**Files:**
- Create: `pipeline/lib/tier.js`
- Create: `pipeline/tests/tier.test.js`

- [ ] **Step 1: Write failing tests for tiering**

```js
// pipeline/tests/tier.test.js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assignTier, generateGapChecklist } from "../lib/tier.js";

describe("assignTier", () => {
  it("RED when legal state fails", () => {
    const hardStops = {
      legalState: { score: "FAIL" },
      msaPopulation: { score: "PASS" },
      lotCount: { score: "PASS" },
      cityUtilities: { score: "PASS" },
    };
    const negotiable = {
      capRate: { score: "PASS" },
      cashOnCash: { score: "PASS" },
      occupancy: { score: "UNKNOWN" },
      fewPOH: { score: "UNKNOWN" },
      priceInRange: { score: "PASS" },
    };
    assert.equal(assignTier(hardStops, negotiable, 3), "RED");
  });

  it("RED when MSA population fails", () => {
    const hardStops = {
      legalState: { score: "PASS" },
      msaPopulation: { score: "FAIL" },
      lotCount: { score: "PASS" },
      cityUtilities: { score: "PASS" },
    };
    const negotiable = {
      capRate: { score: "PASS" },
      cashOnCash: { score: "PASS" },
      occupancy: { score: "UNKNOWN" },
      fewPOH: { score: "UNKNOWN" },
      priceInRange: { score: "PASS" },
    };
    assert.equal(assignTier(hardStops, negotiable, 3), "RED");
  });

  it("RED when city utilities confirmed FAIL", () => {
    const hardStops = {
      legalState: { score: "PASS" },
      msaPopulation: { score: "PASS" },
      lotCount: { score: "PASS" },
      cityUtilities: { score: "FAIL" },
    };
    const negotiable = {
      capRate: { score: "PASS" },
      cashOnCash: { score: "PASS" },
      occupancy: { score: "UNKNOWN" },
      fewPOH: { score: "UNKNOWN" },
      priceInRange: { score: "PASS" },
    };
    assert.equal(assignTier(hardStops, negotiable, 3), "RED");
  });

  it("GRAY when lot count below buy box", () => {
    const hardStops = {
      legalState: { score: "PASS" },
      msaPopulation: { score: "PASS" },
      lotCount: { score: "BELOW_BUYBOX" },
      cityUtilities: { score: "PASS" },
    };
    const negotiable = {
      capRate: { score: "PASS" },
      cashOnCash: { score: "PASS" },
      occupancy: { score: "UNKNOWN" },
      fewPOH: { score: "UNKNOWN" },
      priceInRange: { score: "PASS" },
    };
    assert.equal(assignTier(hardStops, negotiable, 2), "GRAY");
  });

  it("GRAY when lot count below buy box even with high opportunity", () => {
    const hardStops = {
      legalState: { score: "PASS" },
      msaPopulation: { score: "PASS" },
      lotCount: { score: "BELOW_BUYBOX" },
      cityUtilities: { score: "PASS" },
    };
    const negotiable = {
      capRate: { score: "PASS" },
      cashOnCash: { score: "PASS" },
      occupancy: { score: "PASS" },
      fewPOH: { score: "PASS" },
      priceInRange: { score: "PASS" },
    };
    assert.equal(assignTier(hardStops, negotiable, 4), "GRAY");
  });

  it("GREEN when all hard-stops pass + negotiable >= 3 + opportunity >= 2", () => {
    const hardStops = {
      legalState: { score: "PASS" },
      msaPopulation: { score: "PASS" },
      lotCount: { score: "PASS" },
      cityUtilities: { score: "PASS" },
    };
    const negotiable = {
      capRate: { score: "PASS" },
      cashOnCash: { score: "PASS" },
      occupancy: { score: "UNKNOWN" },
      fewPOH: { score: "UNKNOWN" },
      priceInRange: { score: "PASS" },
    };
    assert.equal(assignTier(hardStops, negotiable, 2), "GREEN");
  });

  it("YELLOW when hard-stops pass but has UNKNOWNs and low opportunity", () => {
    const hardStops = {
      legalState: { score: "PASS" },
      msaPopulation: { score: "PASS" },
      lotCount: { score: "UNKNOWN" },
      cityUtilities: { score: "UNKNOWN" },
    };
    const negotiable = {
      capRate: { score: "UNKNOWN" },
      cashOnCash: { score: "UNKNOWN" },
      occupancy: { score: "UNKNOWN" },
      fewPOH: { score: "UNKNOWN" },
      priceInRange: { score: "UNKNOWN" },
    };
    assert.equal(assignTier(hardStops, negotiable, 1), "YELLOW");
  });

  it("YELLOW when negotiable pass count < 3 despite good opportunity", () => {
    const hardStops = {
      legalState: { score: "PASS" },
      msaPopulation: { score: "PASS" },
      lotCount: { score: "PASS" },
      cityUtilities: { score: "PASS" },
    };
    const negotiable = {
      capRate: { score: "PASS" },
      cashOnCash: { score: "PASS" },
      occupancy: { score: "UNKNOWN" },
      fewPOH: { score: "UNKNOWN" },
      priceInRange: { score: "UNKNOWN" },
    };
    assert.equal(assignTier(hardStops, negotiable, 3), "YELLOW");
  });
});

describe("generateGapChecklist", () => {
  it("generates items for UNKNOWN hard-stops", () => {
    const hardStops = {
      legalState: { score: "PASS" },
      msaPopulation: { score: "UNKNOWN" },
      lotCount: { score: "UNKNOWN" },
      cityUtilities: { score: "UNKNOWN" },
    };
    const negotiable = {
      capRate: { score: "UNKNOWN" },
      cashOnCash: { score: "UNKNOWN" },
      occupancy: { score: "UNKNOWN" },
      fewPOH: { score: "UNKNOWN" },
      priceInRange: { score: "UNKNOWN" },
    };
    const park = { county: "Blount", city: "Maryville", address: "123 Main St", zip: "37801" };
    const gaps = generateGapChecklist(hardStops, negotiable, park);
    assert.ok(gaps.length > 0);
    assert.ok(gaps.some(g => g.includes("lot count")));
    assert.ok(gaps.some(g => g.includes("occupancy") || g.includes("Verify occupancy")));
  });

  it("returns empty for all-PASS", () => {
    const hardStops = {
      legalState: { score: "PASS" },
      msaPopulation: { score: "PASS" },
      lotCount: { score: "PASS" },
      cityUtilities: { score: "PASS" },
    };
    const negotiable = {
      capRate: { score: "PASS" },
      cashOnCash: { score: "PASS" },
      occupancy: { score: "PASS" },
      fewPOH: { score: "PASS" },
      priceInRange: { score: "PASS" },
    };
    const park = { county: "Knox", city: "Knoxville", address: "123 Main St", zip: "37914" };
    const gaps = generateGapChecklist(hardStops, negotiable, park);
    assert.equal(gaps.length, 0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
node --test pipeline/tests/tier.test.js
```
Expected: FAIL (module not found)

- [ ] **Step 3: Implement tier.js**

```js
// pipeline/lib/tier.js

export function assignTier(hardStops, negotiable, opportunityScore) {
  // RED: any hard-stop FAIL (legalState, msaPopulation, cityUtilities)
  // Note: lotCount uses BELOW_BUYBOX, not FAIL — it never triggers RED
  const redFields = ["legalState", "msaPopulation", "cityUtilities"];
  for (const field of redFields) {
    if (hardStops[field]?.score === "FAIL") return "RED";
  }

  // GRAY: lot count below buy box
  if (hardStops.lotCount?.score === "BELOW_BUYBOX") return "GRAY";

  // Count negotiable scores
  const negotiableEntries = Object.values(negotiable);
  const passCount = negotiableEntries.filter(e => e.score === "PASS").length;
  const failCount = negotiableEntries.filter(e => e.score === "FAIL").length;
  const unknownCount = negotiableEntries.filter(e => e.score === "UNKNOWN").length;

  // GRAY: all hard-stops pass but >= 3 negotiable FAILs with 0 unknowns
  if (failCount >= 3 && unknownCount === 0) return "GRAY";

  // GREEN: all hard-stops PASS (not UNKNOWN) + negotiable pass >= 3 + opportunity >= 2
  const allHardStopsPass = Object.values(hardStops).every(e => e.score === "PASS");
  if (allHardStopsPass && passCount >= 3 && opportunityScore >= 2) return "GREEN";

  // YELLOW: everything else (has UNKNOWNs, or doesn't meet GREEN thresholds)
  return "YELLOW";
}

export function generateGapChecklist(hardStops, negotiable, park) {
  const gaps = [];

  // Hard-stop unknowns
  if (hardStops.lotCount?.score === "UNKNOWN") {
    gaps.push(`Get lot count: call ${park.county} County Assessor or check plat map`);
  }
  if (hardStops.cityUtilities?.score === "UNKNOWN") {
    gaps.push(`Verify utilities: call city building/planning dept for ${park.city}`);
  }
  if (hardStops.msaPopulation?.score === "UNKNOWN") {
    gaps.push(`Check MSA population at bestplaces.net for zip ${park.zip}`);
  }

  // Negotiable unknowns
  if (negotiable.capRate?.score === "UNKNOWN") {
    gaps.push("Get current lot rent: call park manager or check MHVillage listings");
  }
  if (negotiable.cashOnCash?.score === "UNKNOWN" && negotiable.capRate?.score !== "UNKNOWN") {
    gaps.push("Calculate cash-on-cash: need financing terms");
  }
  if (negotiable.occupancy?.score === "UNKNOWN") {
    gaps.push(`Verify occupancy: call park manager at ${park.address}`);
  }
  if (negotiable.fewPOH?.score === "UNKNOWN") {
    gaps.push("Ask seller for park-owned home count and decades");
  }
  if (negotiable.priceInRange?.score === "UNKNOWN") {
    gaps.push(`Verify price: check assessed value with ${park.county} County Assessor`);
  }

  return gaps;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node --test pipeline/tests/tier.test.js
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add pipeline/lib/tier.js pipeline/tests/tier.test.js
git commit -m "feat: add tier assignment and gap checklist generation"
```

---

### Task 6: Enrich module

**Files:**
- Create: `pipeline/lib/enrich.js`
- Create: `pipeline/tests/enrich.test.js`

- [ ] **Step 1: Write failing tests for enrich**

```js
// pipeline/tests/enrich.test.js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMarketData, getCachedOrNull, enrichZip } from "../lib/enrich.js";

describe("parseMarketData", () => {
  const sampleMarkdown = `
# Knoxville, TN 37914

## Population
The metro area population is 893,690.

## Economy
The unemployment rate is 3.2%.
The median household income is $52,400.

## Housing
The median home price is $295,000.
Rental rates: Studio $750, 1-Bedroom $850, 2-Bedroom $1,050, 3-Bedroom $1,280.
The housing vacancy rate is 6.8%.
`;

  it("extracts MSA population", () => {
    const data = parseMarketData(sampleMarkdown);
    assert.ok(data.msaPopulation);
    assert.ok(data.msaPopulation.includes("893"));
  });

  it("extracts unemployment rate", () => {
    const data = parseMarketData(sampleMarkdown);
    assert.equal(data.unemploymentRate, "3.2");
  });

  it("extracts median home price", () => {
    const data = parseMarketData(sampleMarkdown);
    assert.ok(data.medianHomePrice);
    assert.ok(data.medianHomePrice.includes("295"));
  });

  it("extracts 2BR rent", () => {
    const data = parseMarketData(sampleMarkdown);
    assert.ok(data.rent2BR);
    assert.ok(data.rent2BR.includes("1,050") || data.rent2BR.includes("1050"));
  });

  it("extracts 3BR rent", () => {
    const data = parseMarketData(sampleMarkdown);
    assert.ok(data.rent3BR);
    assert.ok(data.rent3BR.includes("1,280") || data.rent3BR.includes("1280"));
  });

  it("extracts vacancy rate", () => {
    const data = parseMarketData(sampleMarkdown);
    assert.equal(data.vacancyRate, "6.8");
  });

  it("extracts city/state", () => {
    const data = parseMarketData(sampleMarkdown);
    assert.equal(data.cityName, "Knoxville");
    assert.equal(data.stateName, "TN");
  });

  it("returns nulls for empty markdown", () => {
    const data = parseMarketData("");
    assert.equal(data.msaPopulation, null);
    assert.equal(data.unemploymentRate, null);
  });
});

describe("getCachedOrNull", () => {
  it("returns null for non-existent cache", async () => {
    const result = await getCachedOrNull("/tmp/nonexistent-cache-dir-abc123", "99999");
    assert.equal(result, null);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
node --test pipeline/tests/enrich.test.js
```
Expected: FAIL (module not found)

- [ ] **Step 3: Implement enrich.js**

```js
// pipeline/lib/enrich.js
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function parseMarketData(markdown) {
  const data = {
    msaPopulation: null,
    medianHomePrice: null,
    medianHouseholdIncome: null,
    unemploymentRate: null,
    rent2BR: null,
    rent3BR: null,
    vacancyRate: null,
    cityName: null,
    stateName: null,
    topEmployers: null,
  };

  if (!markdown) return data;

  // City/State from header
  const cityMatch = markdown.match(/(?:^|\n)#?\s*([A-Z][a-zA-Z\s]+?),?\s+([A-Z]{2})(?:\s|\n|$)/m);
  if (cityMatch) {
    data.cityName = cityMatch[1].trim();
    data.stateName = cityMatch[2];
  }

  // MSA / metro population
  const popMatch = markdown.match(/(?:metro|msa|metropolitan).*?(?:population|pop)[^\d]*?([\d,]+)/i)
    || markdown.match(/(?:population|pop).*?(?:metro|msa|metropolitan)[^\d]*?([\d,]+)/i)
    || markdown.match(/(?:area\s+population|population)[^\d]*?([\d,]+)/i);
  if (popMatch) data.msaPopulation = popMatch[1];

  // Median home price
  const homeMatch = markdown.match(/median\s+home\s+(?:price|value|cost)[^\$]*?\$([\d,]+)/i)
    || markdown.match(/\$([\d,]+).*?median.*?home/i);
  if (homeMatch) data.medianHomePrice = homeMatch[1];

  // Median household income
  const incomeMatch = markdown.match(/median\s+(?:household\s+)?income[^\$]*?\$([\d,]+)/i);
  if (incomeMatch) data.medianHouseholdIncome = incomeMatch[1];

  // Unemployment
  const unempMatch = markdown.match(/unemploy[^\d]*?([\d.]+)\s*%/i);
  if (unempMatch) data.unemploymentRate = unempMatch[1];

  // 2BR rent
  const rent2Match = markdown.match(/2[\s-]*(?:br|bed|bedroom)[^\$]*?\$([\d,]+)/i)
    || markdown.match(/\$([\d,]+).*?2[\s-]*(?:br|bed|bedroom)/i);
  if (rent2Match) data.rent2BR = rent2Match[1];

  // 3BR rent
  const rent3Match = markdown.match(/3[\s-]*(?:br|bed|bedroom)[^\$]*?\$([\d,]+)/i)
    || markdown.match(/\$([\d,]+).*?3[\s-]*(?:br|bed|bedroom)/i);
  if (rent3Match) data.rent3BR = rent3Match[1];

  // Vacancy rate
  const vacMatch = markdown.match(/(?:housing\s+)?vacanc[yi][^\d]*?([\d.]+)\s*%/i);
  if (vacMatch) data.vacancyRate = vacMatch[1];

  return data;
}

export function parseEmployers(markdown) {
  if (!markdown) return [];
  const employers = [];
  const employerSection = markdown.match(/(?:(?:top|major|largest)\s+employers|economy)[\s\S]*?(?:\n#{1,3}\s|\n\n\n|$)/i);
  if (employerSection) {
    const lines = employerSection[0].split("\n");
    for (const line of lines) {
      const match = line.match(/(?:\|\s*|[-*]\s+|^\d+[.)]\s*)([A-Z][A-Za-z\s&'.,-]+?)(?:\s*\||\s*[-\u2013]\s*[\d,]+|\s*$)/);
      if (match && match[1].trim().length > 2 && employers.length < 10) {
        const name = match[1].trim();
        if (!/^(rank|employer|company|name|#|number)/i.test(name)) {
          employers.push(name);
        }
      }
    }
  }
  return employers;
}

export async function getCachedOrNull(cacheDir, zip) {
  try {
    const cachePath = join(cacheDir, `${zip}.json`);
    const fileStat = await stat(cachePath);
    const age = Date.now() - fileStat.mtimeMs;
    if (age > CACHE_MAX_AGE_MS) return null;
    const raw = await readFile(cachePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveCache(cacheDir, zip, data) {
  await mkdir(cacheDir, { recursive: true });
  const cachePath = join(cacheDir, `${zip}.json`);
  await writeFile(cachePath, JSON.stringify(data, null, 2));
}

async function firecrawlScrape(apiKey, url) {
  const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ url, formats: ["markdown"] }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Firecrawl error ${res.status}`);
  }
  const json = await res.json();
  return json.data?.markdown || "";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function enrichZip(zip, { apiKey, cacheDir, skipEnrich = false }) {
  // Check cache first
  const cached = await getCachedOrNull(cacheDir, zip);
  if (cached) {
    console.log(`  [cache hit] ${zip}`);
    return cached;
  }

  if (skipEnrich || !apiKey) {
    console.log(`  [skip] ${zip} — no API key or --skip-enrich`);
    return null;
  }

  console.log(`  [scraping] bestplaces.net for ${zip}...`);
  try {
    const bpMarkdown = await firecrawlScrape(apiKey, `https://www.bestplaces.net/zip-code/${zip}`);
    const data = parseMarketData(bpMarkdown);
    data.zip = zip;

    // Try Wikipedia for employers if we got a city name
    if (data.cityName && data.stateName) {
      try {
        await sleep(1000); // rate limit
        const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(data.cityName.replace(/\s/g, "_"))},_${data.stateName}`;
        console.log(`  [scraping] Wikipedia for ${data.cityName}, ${data.stateName}...`);
        const wikiMarkdown = await firecrawlScrape(apiKey, wikiUrl);
        data.topEmployers = parseEmployers(wikiMarkdown);
      } catch (err) {
        console.warn(`  [warn] Wikipedia scrape failed for ${data.cityName}: ${err.message}`);
      }
    }

    await saveCache(cacheDir, zip, data);
    await sleep(1000); // rate limit between zips
    return data;
  } catch (err) {
    console.warn(`  [warn] Firecrawl failed for ${zip}: ${err.message}`);
    return null;
  }
}

export async function enrichAllZips(parks, options) {
  const uniqueZips = [...new Set(parks.map(p => p.zip).filter(Boolean))];
  console.log(`\nEnriching ${uniqueZips.length} unique zip codes...\n`);

  const marketByZip = {};
  for (const zip of uniqueZips) {
    marketByZip[zip] = await enrichZip(zip, options);
  }
  return marketByZip;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node --test pipeline/tests/enrich.test.js
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add pipeline/lib/enrich.js pipeline/tests/enrich.test.js
git commit -m "feat: add market enrichment module with Firecrawl scraping and caching"
```

---

### Task 7: Output module

**Files:**
- Create: `pipeline/lib/output.js`
- Create: `pipeline/tests/output.test.js`

- [ ] **Step 1: Write failing tests for output**

```js
// pipeline/tests/output.test.js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildFullReport, buildDealsImport, buildSummary } from "../lib/output.js";

const sampleResult = {
  park: { name: "Test MHP", address: "123 Main", city: "Knoxville", state: "TN", zip: "37914", county: "Knox", lotCount: 85, assessedValue: 750000, ownerName: "Smith Trust", ownerMailingState: "OH", ownershipDate: "2008-03-15", taxStatus: "current" },
  market: { zip: "37914", msaPopulation: "893,690", rent2BR: "1,050", rent3BR: "1,280", medianHomePrice: "295,000", vacancyRate: "6.8", unemploymentRate: "3.2", topEmployers: ["UT Medical Center"], cityName: "Knoxville", stateName: "TN" },
  hardStops: { legalState: { score: "PASS" }, msaPopulation: { score: "PASS" }, lotCount: { score: "PASS" }, cityUtilities: { score: "PASS" } },
  negotiable: { capRate: { score: "PASS", detail: "35% >= 10%" }, cashOnCash: { score: "PASS", detail: "29.5pt spread" }, occupancy: { score: "UNKNOWN" }, fewPOH: { score: "UNKNOWN" }, priceInRange: { score: "PASS", detail: "$8,824/lot" } },
  opportunities: { longOwnership: true, outOfState: true, taxDelinquent: false, undervalued: true, score: 3 },
  tier: "GREEN",
  opportunityScore: 3,
  negotiablePassCount: 3,
  negotiableUnknownCount: 2,
  gapChecklist: [],
};

describe("buildFullReport", () => {
  it("returns JSON string of results array", () => {
    const json = buildFullReport([sampleResult]);
    const parsed = JSON.parse(json);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].park.name, "Test MHP");
    assert.equal(parsed[0].tier, "GREEN");
  });
});

describe("buildDealsImport", () => {
  it("maps to app deal format", () => {
    const json = buildDealsImport([sampleResult]);
    const parsed = JSON.parse(json);
    assert.equal(parsed.length, 1);
    const deal = parsed[0];
    assert.equal(deal.analyzer.lots, 85);
    assert.equal(deal.analyzer.askingPrice, 750000);
    assert.ok(deal.name.includes("Test MHP"));
    assert.ok(deal.name.includes("GREEN"));
    assert.ok(deal.marketCheck.zip === "37914");
    assert.ok(deal.id); // has UUID
  });
});

describe("buildSummary", () => {
  it("includes tier counts", () => {
    const text = buildSummary([sampleResult], "data/mock.csv");
    assert.ok(text.includes("GREEN"));
    assert.ok(text.includes("1 park"));
  });

  it("includes opportunity rankings", () => {
    const text = buildSummary([sampleResult], "data/mock.csv");
    assert.ok(text.includes("Test MHP"));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
node --test pipeline/tests/output.test.js
```
Expected: FAIL (module not found)

- [ ] **Step 3: Implement output.js**

```js
// pipeline/lib/output.js
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { THRESHOLDS } from "../config.js";

export function buildFullReport(results) {
  return JSON.stringify(results, null, 2);
}

export function buildDealsImport(results) {
  const now = new Date().toISOString();
  const deals = results.map((r) => {
    const rent2BR = r.market ? parseFloat(String(r.market.rent2BR || "0").replace(/[$,]/g, "")) : 0;
    const estimatedRent = rent2BR ? Math.round(rent2BR * THRESHOLDS.LOT_RENT_MULTIPLIER) : 200;
    const lots = r.park.lotCount || 50;

    return {
      id: randomUUID(),
      name: `${r.park.name} — ${r.park.city} ${r.park.zip} [${r.tier}]`,
      createdAt: now,
      analyzer: {
        lots,
        lotRent: estimatedRent,
        utilPayer: "tenant",
        targetCap: 10,
        pohCount: 0,
        pohDecade: "90s",
        askingPrice: r.park.assessedValue || 0,
        interestRate: 5.5,
      },
      scorecard: {},
      valueAdd: {
        currentLots: lots,
        currentRent: estimatedRent,
        marketRent: estimatedRent,
        currentOccupancy: 70,
        targetOccupancy: 90,
        utilPayer: "tenant",
        capRate: 10,
      },
      marketCheck: {
        states: {},
        zip: r.park.zip || "",
        firecrawlKey: "",
        marketData: r.market || null,
      },
    };
  });

  return JSON.stringify(deals, null, 2);
}

export function buildSummary(results, inputFile) {
  const now = new Date().toISOString();
  const tiers = { GREEN: [], YELLOW: [], GRAY: [], RED: [] };
  for (const r of results) {
    (tiers[r.tier] || tiers.RED).push(r);
  }

  const lines = [];
  lines.push("MHP Deal Sourcing Pipeline — Knox County TN");
  lines.push(`Run: ${now}`);
  lines.push(`Input: ${results.length} parks from ${inputFile}`);
  lines.push("");
  lines.push("═══ TIER SUMMARY ═══");
  for (const tier of ["GREEN", "YELLOW", "GRAY", "RED"]) {
    const count = tiers[tier].length;
    lines.push(`${tier.padEnd(8)} ${count} park${count !== 1 ? "s" : ""}`);
  }

  // Top opportunities (all tiers, sorted by opportunity score)
  const ranked = [...results]
    .filter(r => r.tier !== "RED")
    .sort((a, b) => b.opportunityScore - a.opportunityScore || b.negotiablePassCount - a.negotiablePassCount);

  if (ranked.length > 0) {
    lines.push("");
    lines.push("═══ TOP OPPORTUNITIES (by signal density) ═══");
    ranked.forEach((r, i) => {
      const lots = r.park.lotCount ? `${r.park.lotCount} lots` : "? lots";
      lines.push(`${i + 1}. [${r.tier}] ${r.park.name} — ${lots} — ${r.park.city} ${r.park.zip} — Score: ${r.opportunityScore}/4`);

      const signals = [];
      if (r.opportunities.longOwnership) {
        const years = r.park.ownershipDate ? Math.floor((Date.now() - new Date(r.park.ownershipDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : "?";
        signals.push(`long ownership (${years}yr)`);
      }
      if (r.opportunities.outOfState) signals.push(`out-of-state (${r.park.ownerMailingState})`);
      if (r.opportunities.taxDelinquent) signals.push("tax delinquent");
      if (r.opportunities.undervalued) {
        const perLot = r.park.lotCount ? `$${(r.park.assessedValue / r.park.lotCount / 1000).toFixed(1)}K/lot` : "undervalued";
        signals.push(`undervalued (${perLot})`);
      }
      if (signals.length) lines.push(`   Signals: ${signals.join(", ")}`);

      if (r.gapChecklist.length > 0) {
        lines.push(`   Gaps: ${r.gapChecklist.length} items`);
      }
    });
  }

  // Yellow gap report
  if (tiers.YELLOW.length > 0) {
    lines.push("");
    lines.push("═══ YELLOW PARKS — GAP REPORT ═══");
    for (const r of tiers.YELLOW) {
      lines.push(`${r.park.name} (${r.park.city} ${r.park.zip}):`);
      for (const gap of r.gapChecklist) {
        lines.push(`  [ ] ${gap}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

export async function writeOutputFiles(results, inputFile, outputDir) {
  await mkdir(outputDir, { recursive: true });

  const fullReportPath = join(outputDir, "full-report.json");
  const dealsImportPath = join(outputDir, "deals-import.json");
  const summaryPath = join(outputDir, "summary.txt");

  await Promise.all([
    writeFile(fullReportPath, buildFullReport(results)),
    writeFile(dealsImportPath, buildDealsImport(results)),
    writeFile(summaryPath, buildSummary(results, inputFile)),
  ]);

  return { fullReportPath, dealsImportPath, summaryPath };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node --test pipeline/tests/output.test.js
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add pipeline/lib/output.js pipeline/tests/output.test.js
git commit -m "feat: add output module — full report, deals import, and summary"
```

---

### Task 8: CLI entry point

**Files:**
- Create: `pipeline/run.js`

- [ ] **Step 1: Create run.js — wires all modules together**

```js
#!/usr/bin/env node
// pipeline/run.js — MHP Deal Sourcing Pipeline entry point
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestCSV } from "./lib/ingest.js";
import { enrichAllZips } from "./lib/enrich.js";
import { scoreHardStops, scoreNegotiable, scoreOpportunities } from "./lib/score.js";
import { assignTier, generateGapChecklist } from "./lib/tier.js";
import { writeOutputFiles } from "./lib/output.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    csvPath: null,
    skipEnrich: false,
    cacheDir: resolve(__dirname, ".cache"),
    outputDir: resolve(__dirname, "output"),
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--skip-enrich") {
      options.skipEnrich = true;
    } else if (args[i] === "--cache-dir" && args[i + 1]) {
      options.cacheDir = resolve(args[++i]);
    } else if (args[i] === "--output-dir" && args[i + 1]) {
      options.outputDir = resolve(args[++i]);
    } else if (!args[i].startsWith("--")) {
      options.csvPath = resolve(args[i]);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv);
  const apiKey = process.env.FIRECRAWL_API_KEY || "";

  if (!options.csvPath) {
    console.error("Usage: node pipeline/run.js <csv-file> [--skip-enrich] [--cache-dir <dir>]");
    process.exit(1);
  }

  console.log("╔══════════════════════════════════════════╗");
  console.log("║   MHP Deal Sourcing Pipeline             ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\nInput:  ${options.csvPath}`);
  console.log(`Cache:  ${options.cacheDir}`);
  console.log(`Output: ${options.outputDir}`);
  if (options.skipEnrich) console.log("Mode:   --skip-enrich (using cache only)");
  if (!apiKey && !options.skipEnrich) console.log("⚠  No FIRECRAWL_API_KEY — market enrichment will be skipped");

  // Phase 1: Ingest
  console.log("\n── Phase 1: Ingest CSV ──");
  const parks = await ingestCSV(options.csvPath);
  console.log(`Loaded ${parks.length} park records`);
  const warnings = parks.filter(p => p.validation.length > 0);
  if (warnings.length) console.log(`⚠  ${warnings.length} records have validation warnings`);

  // Phase 2: Enrich
  console.log("\n── Phase 2: Market Enrichment ──");
  const marketByZip = await enrichAllZips(parks, {
    apiKey,
    cacheDir: options.cacheDir,
    skipEnrich: options.skipEnrich || !apiKey,
  });

  // Phases 3-6: Score, Tier, Gap
  console.log("\n── Phases 3-6: Score & Tier ──");
  const results = parks.map((park) => {
    const market = marketByZip[park.zip] || null;
    const hardStops = scoreHardStops(park, market);
    const negotiable = scoreNegotiable(park, market);
    const opportunities = scoreOpportunities(park);
    const tier = assignTier(hardStops, negotiable, opportunities.score);
    const gapChecklist = tier === "YELLOW" ? generateGapChecklist(hardStops, negotiable, park) : [];

    const negotiablePassCount = Object.values(negotiable).filter(e => e.score === "PASS").length;
    const negotiableUnknownCount = Object.values(negotiable).filter(e => e.score === "UNKNOWN").length;

    return {
      park,
      market,
      hardStops,
      negotiable,
      opportunities,
      tier,
      opportunityScore: opportunities.score,
      negotiablePassCount,
      negotiableUnknownCount,
      gapChecklist,
    };
  });

  // Sort within tiers: opportunity score desc, then negotiable pass count desc
  results.sort((a, b) => {
    const tierOrder = { GREEN: 0, YELLOW: 1, GRAY: 2, RED: 3 };
    const tierDiff = (tierOrder[a.tier] ?? 4) - (tierOrder[b.tier] ?? 4);
    if (tierDiff !== 0) return tierDiff;
    if (b.opportunityScore !== a.opportunityScore) return b.opportunityScore - a.opportunityScore;
    return b.negotiablePassCount - a.negotiablePassCount;
  });

  // Output
  console.log("\n── Writing Output ──");
  const paths = await writeOutputFiles(results, options.csvPath, options.outputDir);

  // Summary
  const tierCounts = { GREEN: 0, YELLOW: 0, GRAY: 0, RED: 0 };
  results.forEach(r => tierCounts[r.tier]++);

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   Results                                ║");
  console.log("╠══════════════════════════════════════════╣");
  console.log(`║   GREEN:  ${String(tierCounts.GREEN).padEnd(3)} parks                      ║`);
  console.log(`║   YELLOW: ${String(tierCounts.YELLOW).padEnd(3)} parks                      ║`);
  console.log(`║   GRAY:   ${String(tierCounts.GRAY).padEnd(3)} parks                      ║`);
  console.log(`║   RED:    ${String(tierCounts.RED).padEnd(3)} parks                      ║`);
  console.log("╠══════════════════════════════════════════╣");
  console.log(`║   Full report:   ${paths.fullReportPath}`);
  console.log(`║   Deals import:  ${paths.dealsImportPath}`);
  console.log(`║   Summary:       ${paths.summaryPath}`);
  console.log("╚══════════════════════════════════════════╝");
}

main().catch((err) => {
  console.error("\n✗ Pipeline failed:", err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add pipeline/run.js
git commit -m "feat: add pipeline CLI entry point"
```

---

### Task 9: End-to-end validation

**Files:** No new files. Uses all existing files.

- [ ] **Step 1: Run pipeline with mock data (skip enrichment)**

```bash
node pipeline/run.js data/mock-propstream.csv --skip-enrich
```

Expected output: tier counts matching approximately GREEN ~5, YELLOW ~8, GRAY ~10, RED ~7. All three output files written to `pipeline/output/`.

- [ ] **Step 2: Verify full-report.json structure**

```bash
node -e "const r = JSON.parse(require('fs').readFileSync('pipeline/output/full-report.json','utf-8')); console.log('Records:', r.length); console.log('Sample tier:', r[0].tier); console.log('Sample park:', r[0].park.name); console.log('Has hardStops:', !!r[0].hardStops); console.log('Has negotiable:', !!r[0].negotiable); console.log('Has opportunities:', !!r[0].opportunities);"
```

Expected: 30 records, all fields present.

- [ ] **Step 3: Verify deals-import.json matches app format**

```bash
node -e "const d = JSON.parse(require('fs').readFileSync('pipeline/output/deals-import.json','utf-8')); console.log('Deals:', d.length); const first = d[0]; console.log('Has id:', !!first.id); console.log('Has analyzer:', !!first.analyzer); console.log('Has scorecard:', typeof first.scorecard === 'object'); console.log('Has valueAdd:', !!first.valueAdd); console.log('Has marketCheck:', !!first.marketCheck); console.log('Name format:', first.name);"
```

Expected: all fields match `defaultDeal()` shape from `src/App.jsx`.

- [ ] **Step 4: Verify summary.txt is readable**

```bash
cat pipeline/output/summary.txt
```

Expected: tier counts, opportunity rankings, gap report for YELLOW parks.

- [ ] **Step 5: Run all tests**

```bash
node --test pipeline/tests/*.test.js
```

Expected: all PASS.

- [ ] **Step 6: Fix any issues found during validation**

If tier counts are off from targets, adjust mock CSV data values. If output format doesn't match, fix the output module. Re-run tests after any fixes.

- [ ] **Step 7: Commit and push**

```bash
git add -A
git commit -m "feat: complete deal sourcing pipeline — end-to-end validated with mock data"
git push origin main
```

---

### Task 10: Deploy updated site

- [ ] **Step 1: Add import functionality to the React app**

In `src/App.jsx`, add an "Import Deals" button to the deal selector area that reads a JSON file and merges into localStorage. Add this function and button inside the `App` component:

```jsx
// Add inside App component, after the deleteDeal function:
const importDeals = async () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (!Array.isArray(imported)) throw new Error("Expected array");
      setDeals((prev) => [...prev, ...imported]);
    } catch (err) {
      alert("Invalid deals JSON file: " + err.message);
    }
  };
  input.click();
};
```

Add the import button between the New and Delete buttons in the deal selector JSX:

```jsx
<button onClick={importDeals} style={{
  background: "#1a2d5c", border: "none", borderRadius: 6, color: "#60a5fa",
  padding: "8px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer"
}}>Import</button>
```

- [ ] **Step 2: Build and deploy**

```bash
npx vite build
npx netlify-cli deploy --prod --dir=dist
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add JSON import button for pipeline deals"
git push origin main
```

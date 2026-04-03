# MHP Deal Sourcing Pipeline — Design Spec

**Date:** 2026-04-03
**Status:** Approved
**Validation target:** Knox County, TN (Knox, Blount, Sevier, Anderson counties)

## Objective

Node.js CLI pipeline that ingests a PropStream CSV export of mobile home parks, enriches with market data via Firecrawl, scores against Justin Donald's 10-point framework, and produces tiered output with gap analysis. Runs with mock data first; real PropStream CSV swapped in later.

## Architecture

```
pipeline/
  run.js              # entry point
  lib/
    ingest.js         # CSV parsing + validation
    enrich.js         # Firecrawl bestplaces.net scraping, cached per zip
    score.js          # hard-stop filter + negotiable scoring + opportunity signals
    tier.js           # GREEN/YELLOW/GRAY/RED assignment + gap checklists
    output.js         # writes all output files
  config.js           # scoring thresholds, KUB zips, constants
data/
  mock-propstream.csv # 30 mock records for validation
pipeline/output/      # generated, gitignored
  full-report.json
  deals-import.json
  summary.txt
```

### CLI Interface

```bash
node pipeline/run.js data/propstream.csv

# Options:
#   --skip-enrich    Run without Firecrawl (uses cached data or nulls)
#   --cache-dir      Directory for cached market data (default: pipeline/.cache)
```

Firecrawl API key provided via `FIRECRAWL_API_KEY` environment variable.

## Phase 1 — Ingest CSV

### Expected PropStream Columns

| Column | Maps to | Required |
|--------|---------|----------|
| park_name | park.name | yes |
| address | park.address | yes |
| city | park.city | yes |
| zip | park.zip | yes |
| county | park.county | yes |
| owner_name | park.ownerName | no |
| owner_mailing_address | park.ownerMailingAddress | no |
| owner_mailing_city | park.ownerMailingCity | no |
| owner_mailing_state | park.ownerMailingState | no |
| owner_mailing_zip | park.ownerMailingZip | no |
| lot_count | park.lotCount | no (UNKNOWN if missing) |
| assessed_value | park.assessedValue | no |
| year_built | park.yearBuilt | no |
| ownership_date | park.ownershipDate | no |
| tax_status | park.taxStatus | no |
| equity_percent | park.equityPercent | no |
| mortgage_amount | park.mortgageAmount | no |

### Validation

- Required fields missing: log warning, include record with flag `validation: ["missing_park_name"]`
- Zip code: must be 5 digits. Strip leading zeros if needed.
- Lot count: parse as integer. If blank/zero/non-numeric, set to `null` (treated as UNKNOWN).
- Assessed value: parse as number, strip `$` and commas.
- Ownership date: parse to ISO date. If unparseable, set to `null`.
- Tax status: normalize to lowercase. Look for "delinquent", "current", etc.

Column names are normalized: lowercased, spaces/special chars replaced with underscores. This handles PropStream export variations.

## Phase 2 — Enrich with Market Data

### Per unique zip code, scrape bestplaces.net:

**URL pattern:** `https://www.bestplaces.net/zip-code/{zip}`

**Fields extracted (via regex on Firecrawl markdown output):**
- MSA population
- Median household income
- Unemployment rate
- Median home price
- 2BR apartment rent
- 3BR apartment rent
- Housing vacancy rate

**Wikipedia scrape for top employers:**
- Derive city/state from bestplaces content
- URL: `https://en.wikipedia.org/wiki/{City},_{ST}`
- Extract up to 10 employers from economy section

### Caching

- Cache results in `pipeline/.cache/{zip}.json`
- If cache file exists and is < 7 days old, skip Firecrawl call
- `--skip-enrich` flag: use cache if available, otherwise leave market fields null

### Rate Limiting

- 1-second delay between Firecrawl API calls
- If Firecrawl returns error, log warning and continue (park gets null market data, scored as UNKNOWN where market data needed)

## Phase 3 — Hard-Stop Filter (Criteria 1-5)

Each criterion scores: `PASS`, `FAIL`, or `UNKNOWN`.

| # | Criterion | Logic | FAIL = |
|---|-----------|-------|--------|
| 1 | Legal state | Park state == TN: auto-PASS | RED |
| 2 | MSA >= 100K population | From bestplaces enrichment. If no data: UNKNOWN | RED |
| 3 | 50+ lots | `lotCount >= 50`: PASS. `lotCount < 50`: triggers GRAY (not RED). `lotCount == null`: UNKNOWN | GRAY (not RED) |
| 4 | City utilities | Knox County: cross-reference KUB service area zips. Other counties: UNKNOWN | RED (if confirmed non-city), otherwise UNKNOWN |
| 5 | MSA population | Same check as #2 (deduplicated — single check feeds both) | RED |

**Critical rule:** Lot count never triggers RED. `< 50` = GRAY (wrong buy box). `null` = UNKNOWN (YELLOW, needs research).

### KUB Service Area Zips (Knox County)

```
37901-37924, 37927-37932, 37934, 37938, 37950, 37995-37998
```

Parks in Knox County with zip in this list: PASS for city utilities.
Parks in Knox County with zip NOT in this list: UNKNOWN (edge of service area).
Parks in other counties: UNKNOWN (requires manual verification).

## Phase 4 — Negotiable Criteria (Criteria 6-10)

Each scores: `PASS`, `FAIL`, or `UNKNOWN` with a detail string.

| # | Criterion | Logic |
|---|-----------|-------|
| 6 | Cap rate >= 10% | Implied cap = (lotCount x estimatedMarketRent x 0.7 x 12) / assessedValue. If either input missing: UNKNOWN. Market rent estimated from bestplaces 2BR rent x 0.35 (lot rent is ~35% of apartment rent as heuristic). |
| 7 | Cash-on-cash >= 20% | Requires cap rate from #6 + assumed 5.5% interest rate. Spread = cap - interest. If spread >= 3pts: PASS. Else: FAIL. If cap unknown: UNKNOWN. |
| 8 | Occupancy >= 70% | PropStream does not provide this. Always UNKNOWN. Gap: "Verify occupancy with park manager or county records." |
| 9 | Few park-owned homes | PropStream does not provide this. Always UNKNOWN. Gap: "Ask seller for POH count and decade breakdown." |
| 10 | Price in range | assessedValue / lotCount as $/lot proxy. < $25K/lot: PASS (likely good value). $25K-$50K/lot: PASS with note. > $50K/lot: FAIL (likely overpriced for MHP). Missing data: UNKNOWN. |

### Estimated Market Rent Heuristic

The 0.35 multiplier is a rough proxy: if 2BR apartments rent for $800/mo, lot rent in the area is approximately $280/mo. This is a starting estimate for scoring only — the gap checklist always recommends verifying actual lot rents.

## Phase 5 — Opportunity Signals (Off-Market Scoring)

Each signal is boolean. Total opportunity score = count of true signals (0-4).

| Signal | Logic |
|--------|-------|
| Long ownership | `ownershipDate` is > 10 years ago (before 2016-04-03) |
| Out-of-state owner | `ownerMailingState` != "TN" (and not null) |
| Tax delinquent | `taxStatus` contains "delinquent" (case-insensitive) |
| Undervalued | `assessedValue / lotCount < $15,000` per lot (both values present) |

## Phase 6 — Tiering

| Tier | Rule |
|------|------|
| RED | Any hard-stop FAIL (criteria 1, 2, 4 confirmed fail). Exception: lot count — see GRAY. |
| GRAY | Lot count < 50 (wrong buy box) OR all hard-stops pass but negotiable score has >= 3 FAILs with 0 UNKNOWNs (confirmed bad deal). |
| YELLOW | All hard-stops PASS or UNKNOWN + has any UNKNOWN in negotiable criteria OR negotiable known-score < 3. Gap checklist generated. |
| GREEN | All hard-stops PASS + negotiable known-score >= 3 + opportunity score >= 2. |

### Tiebreaking within tiers

Parks within the same tier are sorted by opportunity score (descending), then by negotiable pass count (descending).

### Gap Checklist Generation (YELLOW parks)

For each UNKNOWN field, generate an actionable next step:

| Unknown | Gap item |
|---------|----------|
| Lot count | "Get lot count: call {county} County Assessor or check plat map" |
| City utilities | "Verify utilities: call city building/planning dept for {city}" |
| MSA population | "Check MSA population at bestplaces.net for zip {zip}" |
| Occupancy | "Verify occupancy: call park manager at {address}" |
| POH count | "Ask seller for park-owned home count and decades" |
| Lot rent | "Get current lot rent: call park manager or check MHVillage listings" |
| Cap rate | "Calculate cap rate: need lot rent and occupancy first" |

## Output Files

### full-report.json

```json
[
  {
    "park": {
      "name": "Sunrise MHP",
      "address": "123 Park Rd",
      "city": "Knoxville",
      "zip": "37914",
      "county": "Knox",
      "ownerName": "Smith Family Trust",
      "ownerMailingAddress": "456 Oak St",
      "ownerMailingCity": "Columbus",
      "ownerMailingState": "OH",
      "ownerMailingZip": "43215",
      "lotCount": 72,
      "assessedValue": 850000,
      "yearBuilt": 1985,
      "ownershipDate": "2008-03-15",
      "taxStatus": "current",
      "equityPercent": 100,
      "mortgageAmount": 0
    },
    "market": {
      "zip": "37914",
      "msaPopulation": "893,690",
      "medianHomePrice": "295,000",
      "medianHouseholdIncome": "52,400",
      "unemploymentRate": "3.2",
      "rent2BR": "1,050",
      "rent3BR": "1,280",
      "vacancyRate": "6.8",
      "topEmployers": ["UT Medical Center", "Covenant Health", "..."]
    },
    "hardStops": {
      "legalState": { "score": "PASS", "detail": "TN = auto-pass" },
      "msaPopulation": { "score": "PASS", "detail": "893,690 >= 100,000" },
      "lotCount": { "score": "PASS", "detail": "72 >= 50" },
      "cityUtilities": { "score": "PASS", "detail": "37914 in KUB service area" }
    },
    "negotiable": {
      "capRate": { "score": "UNKNOWN", "detail": "Missing lot rent data" },
      "cashOnCash": { "score": "UNKNOWN", "detail": "Requires cap rate" },
      "occupancy": { "score": "UNKNOWN", "detail": "Not in PropStream data" },
      "fewPOH": { "score": "UNKNOWN", "detail": "Not in PropStream data" },
      "priceInRange": { "score": "PASS", "detail": "$11,806/lot — good value" }
    },
    "opportunities": {
      "longOwnership": true,
      "outOfState": true,
      "taxDelinquent": false,
      "undervalued": true
    },
    "tier": "YELLOW",
    "opportunityScore": 3,
    "negotiablePassCount": 1,
    "negotiableUnknownCount": 4,
    "gapChecklist": [
      "Get current lot rent: call park manager or check MHVillage listings",
      "Calculate cap rate: need lot rent and occupancy first",
      "Verify occupancy: call park manager at 123 Park Rd",
      "Ask seller for park-owned home count and decades"
    ]
  }
]
```

### deals-import.json

Array matching the app's `defaultDeal()` shape:

```json
[
  {
    "id": "<generated uuid>",
    "name": "Sunrise MHP — Knoxville 37914 [YELLOW]",
    "createdAt": "<pipeline run timestamp>",
    "analyzer": {
      "lots": 72,
      "lotRent": 368,
      "utilPayer": "tenant",
      "targetCap": 10,
      "pohCount": 0,
      "pohDecade": "90s",
      "askingPrice": 850000,
      "interestRate": 5.5
    },
    "scorecard": {},
    "valueAdd": {
      "currentLots": 72,
      "currentRent": 368,
      "marketRent": 368,
      "currentOccupancy": 70,
      "targetOccupancy": 90,
      "utilPayer": "tenant",
      "capRate": 10
    },
    "marketCheck": {
      "states": {},
      "zip": "37914",
      "firecrawlKey": "",
      "marketData": {
        "msaPopulation": "893,690",
        "medianHomePrice": "295,000",
        "rent2BR": "1,050",
        "rent3BR": "1,280",
        "vacancyRate": "6.8",
        "unemploymentRate": "3.2",
        "topEmployers": ["UT Medical Center", "..."],
        "cityName": "Knoxville",
        "stateName": "TN"
      }
    }
  }
]
```

Fields mapped:
- `analyzer.lots` = lotCount (or 50 default if unknown)
- `analyzer.lotRent` = estimated market rent (2BR rent x 0.35)
- `analyzer.askingPrice` = assessedValue
- `analyzer.interestRate` = 5.5 (default assumption)
- `valueAdd.currentLots` = lotCount
- `valueAdd.currentRent` = estimated market rent
- `marketCheck.zip` = zip
- `marketCheck.marketData` = enrichment data

### summary.txt

```
MHP Deal Sourcing Pipeline — Knox County TN
Run: 2026-04-03T14:30:00Z
Input: 30 parks from data/mock-propstream.csv

═══ TIER SUMMARY ═══
GREEN:  5 parks
YELLOW: 8 parks
GRAY:  10 parks
RED:    7 parks

═══ TOP OPPORTUNITIES (by signal density) ═══
1. [YELLOW] Sunrise MHP — 72 lots — Knoxville 37914 — Score: 3/4
   Signals: long ownership (18yr), out-of-state (OH), undervalued ($11.8K/lot)
   Gaps: lot rent, occupancy, POH count, cap rate

2. [GREEN] Valley View Estates — 85 lots — Maryville 37801 — Score: 3/4
   ...

═══ YELLOW PARKS — GAP REPORT ═══
Sunrise MHP (Knoxville 37914):
  [ ] Get current lot rent: call park manager or check MHVillage listings
  [ ] Verify occupancy: call park manager at 123 Park Rd
  [ ] Ask seller for park-owned home count and decades
  [ ] Calculate cap rate: need lot rent and occupancy first
...
```

## Mock Data Strategy

30 records across 4 counties, using real zip codes:

**Target distribution:**
- ~5 GREEN: 60+ lots, long ownership, out-of-state owner, good assessed values, KUB-area Knox County zips
- ~8 YELLOW: pass hard-stops but missing lot count or other data gaps
- ~10 GRAY: under 50 lots (15-45 range), small parks that don't fit buy box
- ~7 RED: parks in very rural zips (Sevier County mountain areas with MSA < 100K would need to be fabricated since Knoxville MSA covers most of these — instead, use implausible scenarios like missing city utilities confirmed)

**Real zip codes by county:**
- Knox: 37902, 37909, 37912, 37914, 37917, 37918, 37920, 37921, 37922, 37923, 37924, 37931, 37932, 37934, 37938
- Blount: 37801, 37803, 37804, 37853, 37882
- Sevier: 37862, 37863, 37876
- Anderson: 37716, 37830

**How RED is triggered in mock data:** All real East TN zips are within the Knoxville MSA (~900K), so MSA won't trigger RED. Instead, RED mocks use:
- 2-3 parks with out-of-state addresses (GA, KY) to test the legal-state filter
- 2-3 parks with `utilities: "well/lagoon"` field in mock data to test confirmed non-city-utility failure
- 1-2 parks combining both

## Dependencies

- Node.js (no build step, ES modules)
- `csv-parse` npm package for CSV parsing
- Firecrawl API (via fetch, no SDK needed)
- No other external dependencies

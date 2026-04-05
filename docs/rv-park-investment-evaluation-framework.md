# RV Park Investment Evaluation Framework

**Compiled from Dustin Kercher's Subto Community Underwriting Sessions**
**8 transcripts processed | 82 framework items + research-backed supplements**
**Source: Director of Acquisitions, multi-billion dollar hedge fund | 20 years, 5,000+ transactions | 800+ MHP pads, multiple RV parks**

*Framework version: April 2026*
*Maintained by: Ian Titus | Battle Field Development Group LLC*

---

## HOW TO USE THIS DOCUMENT

This framework serves two purposes:

1. **Deal evaluation reference** — Use the hard stops, negotiable criteria, and scoring parameters to evaluate any RV park deal quickly and consistently.
2. **Pipeline configuration source** — The thresholds, defaults, and formulas map directly to `config.js` in the deal sourcing pipeline (mhp-deal-analyzer repo, RV mode).

Every threshold has a source: either Dustin's direct statement from the transcripts, derived from his methodology, or research-backed from industry data. Where items come from research rather than Dustin, they're marked with *[Research]*.

---

## PART 1: HARD STOPS

These kill the deal immediately. If any hard stop fails, the deal is RED — no further analysis needed.

### HS-1: No Identifiable Demand Driver
The park must have a clear, verifiable reason people come to the area: tourism, employment center, recreation destination, military base, university, or major highway corridor. Unlike MHPs (which serve housing demand), RV parks require active demand generation.

**Validation methods:**
- Ghost ad testing ($5-10/day on Hipcamp, Campendium, or Facebook) to measure actual booking interest before committing capital
- Google Trends for the area
- Campground review density on Google/Campendium
- Booking.com or Hipcamp presence for the market
- Tourism board data, visitor center counts

### HS-2: County Population Under 10K Without Nearby Town Over 25K
Population serves as a proxy for economic viability, workforce availability, and demand sustainability. Exception: parks with dominant tourism demand drivers (national park adjacent, major recreational waterway) can pass this threshold if the demand driver is verified.

### HS-3: More Than 60 Minutes from Walmart/Home Depot
This is a workforce and supply chain proxy. If you can't staff the park or get supplies without a 2-hour round trip, operations become unsustainably expensive. Dustin uses this as a quick filter before deeper analysis.

### HS-4: No Monthly P&L Provided
Annual P&L only is insufficient for RV parks. You must see monthly revenue breakdown to evaluate seasonality. A seller who can only produce annual numbers either doesn't track performance (red flag) or is hiding seasonal cash flow gaps. **This is different from MHPs**, where annual P&L is workable because MHP income is more stable month-to-month.

### HS-5: Asking Price Exceeds 130% of NOI/Cap-Rate Value
If the gap between asking price and income-approach valuation exceeds 30%, the deal is too far off to negotiate productively. Exception: seller financing with terms favorable enough to bridge the gap (deferred payments, extended due diligence, below-market rate).

---

## PART 2: NEGOTIABLE CRITERIA

These shape the offer price and deal structure. Each has a target, a threshold, and an impact on scoring.

### NC-1: Cap Rate Target — 10%+ With Upside

**Cap rate derivation method (Dustin's formula):**
1. Go to apartmentloanstore.com
2. Look up suburban C-class cap rate for the nearest city that appears
3. Add 3 points for RV parks (vs 2-2.5 points for MHP)
4. For markets too small to appear, use nearest larger city and add 0.5-1 additional point for rural/size discount

**Scoring:**
- GREEN: ≥10% cap on current NOI
- YELLOW: 8-10% cap (workable with value-add)
- RED: <8% cap (overpaying unless California/West Coast premium market)

**Note:** California and coastal West Coast markets trade at lower cap rates (6-8% is common). Dustin still buys there but applies stricter operational scrutiny and requires stronger demand drivers.

### NC-2: Expense Ratio Benchmark

| Park Type | Expected Expense Ratio |
|-----------|----------------------|
| MHP (city sewer) | 30-40% |
| MHP (septic) | 45% |
| RV park (transient/campground) | 50-60% |
| RV park (long-term only) | 40-50% |
| RV park (tenant-owned pads only) | 35-40% |
| Mixed STR/RV | 50-55% |
| RV with park-owned structures | 45% |
| Smaller parks (<50 sites) | Add 5% to applicable range |
| High-regulation states (CA/NY/PA) | Add 5-10% |

**Critical rule:** If a seller's reported expense ratio is below the floor for their park type, their P&L is incomplete or fabricated. Apply your own expense ratio using the table above. Dustin: "I don't really care too much about their P&L... I'm going to add my own expense ratio based on my experience."

**What a healthy P&L looks like:** Revenue broken out by source (lot rent, nightly, monthly, RTO, laundry, propane, storage). Expenses broken out into at minimum: payroll, utilities, insurance, property taxes, R&M, management fees, marketing, supplies, software/booking fees. If the P&L is a single-page summary with 3-4 line items, it's been edited to show what the seller wants you to see.

### NC-3: Monthly Occupancy Curve vs Market Comparables

**Peak season (best 3-4 months):**
- GREEN: ≥90% occupancy
- YELLOW: 70-90%
- RED: <70%

**Off-season (worst 3-4 months):**
- GREEN: ≥40% occupancy
- YELLOW: 20-40%
- RED: <20%

**Year-round long-term parks:** Should maintain 70%+ consistently. Seasonal dips below 60% in a "long-term" park indicate the long-term stays aren't actually stable.

### NC-4: Staffing Economics — Owner Labor Identified and Replacement Costed

If the owner is on-site managing, their labor must be costed at replacement rate. A park where the owner "visits three times a year" has clean payroll numbers. A park where the owner is the general manager needs $60-120K added to expenses.

**Staffing cost defaults:** *[Research]*

| Park Type | Size | Annual Staffing Cost |
|-----------|------|---------------------|
| Long-term only (MHP-style) | 50-100 pads | $60-80K |
| Long-term RV | 50-100 sites | $80-120K |
| Mixed (long-term + nightly) | 50-100 sites | $150-200K |
| Transient/campground | 50-100 sites | $200-250K |
| Large resort | 100+ sites | $250K+ |

**Work campers are NOT a staffing plan.** They supplement, they don't replace. You cannot underwrite a park assuming work camper labor continues at current levels.

### NC-5: Revenue Breakdown by Source Type

Revenue should be segmented: lot rent, nightly/weekly, monthly, RTO payments, laundry, propane, storage, camp store, amenity fees, dump station, other.

**Revenue concentration flag:** If any single source exceeds 40% of NOI, flag it. A park that's 90% nightly revenue has pure seasonal risk. A park that's 90% long-term monthly has stability but limited upside.

**RTO (Rent-to-Own) handling:** Strip RTO note income from the P&L entirely. Value the park on lot rent only. Negotiate notes separately — either seller retains notes (preferred) or buyer acquires at 50% of remaining face value. RTO income will expire when note terms end.

**Ancillary revenue benchmark:** *[Research]* Ancillary revenue (laundry, propane, camp store, amenity fees) typically represents ~20% of total revenue. If claimed ancillary exceeds 25% of total, either nightly rates are too low or the numbers are inflated.

### NC-6: LTV Max 65% for RV Parks

RV parks carry higher risk than MHPs from a lender's perspective. Maximum LTV is 65% (vs 70% for MHP). This means more equity required and potentially higher rates.

**Lender vacancy rate assumptions:**
- MHP: 5-8%
- RV parks: 15-25%

**Agency debt restriction:** Agency lenders cap POH/RV income recognition at 20-35% of total income. If a park has heavy park-owned structures or RV-specific income, the lendable income is lower than the P&L shows.

### NC-7: DSCR on Current NOI

Debt Service Coverage Ratio must be calculated on current (not pro forma) NOI. Target: 1.25x minimum. If the deal doesn't cash flow on day one at the proposed purchase price and financing terms, the price is wrong.

**Seasonal DSCR stress test:** *[Research]*
1. Take the three lowest-revenue months from the monthly P&L
2. Apply the park's expense ratio to each month
3. Calculate monthly NOI for each
4. Compare against monthly debt service (annual P&I ÷ 12)
5. If any month's NOI < monthly debt service, the shortfall = additional reserves needed

If no monthly P&L is available, apply these seasonal discount defaults:
- Seasonal parks: worst 3 months revenue = 40-50% of average monthly
- Year-round parks: worst 3 months revenue = 70-80% of average monthly

---

## PART 3: OPPORTUNITY SIGNALS

These don't change the valuation but indicate potential upside or favorable negotiating position.

### OS-1: Unsophisticated Owner
Not tracking revenue by source, no booking software, hand-written P&L, Excel-only financials, no accountant or property management software. These owners typically undervalue their asset and leave operational money on the table.

### OS-2: Below-Market Rents with High Occupancy
If lot rents or nightly rates are 20%+ below market comparables AND occupancy is strong, the upside is immediately achievable. Budget 20-30% tenant loss on rent increases for long-term stays. Increases must be phased over 2-3 years — never a single jump. Dustin's experience: raised $325→$450 (38% increase), lost 15% of tenants.

### OS-3: Utilities Included / Not Individually Metered
Bill-back opportunity. Default embedded utility cost: $75/site/month *[Research]*. Metering and billing separately recovers $600-1,200/site/year.

### OS-4: Seasonal Park with Winterization Potential
Converting a seasonal park to year-round operation (heated bathhouses, winterized water lines) adds 3-4 months of revenue. Capital intensive but changes the entire income profile.

### OS-5: No Direct Booking / OTA-Dependent
Parks without their own booking system are leaving money on the table (OTA commissions 15-20%). Adding direct booking (Staylish, Campspot, Campground Master) is an immediate margin improvement.

### OS-6: Waiting List or Turn-Away Evidence
Proven demand exceeding supply. This is the strongest signal for expansion potential or rate increase justification. Ask for booking software data showing denied or waitlisted reservations.

### OS-7: Negotiation Language Signals
Seller "testing the market," "flexible on terms," or willing to discuss creative structure. Combined with any of the above signals, this indicates a motivated seller who may accept below-asking offers.

### OS-8: Long Ownership (10+ Years)
The property tax assessed value may be significantly below market. The seller has likely depreciated the asset and may accept a lower price for tax reasons. However, the **buyer** should budget for a property tax reassessment to market value after closing (see Property Tax section).

### OS-9: Out-of-State Owner
Indicates the park is not owner-managed. Management is already professionalized (or neglected). Either way, the buyer knows the payroll numbers should be representative of actual operating cost.

### OS-10: Performance-Based Equity for Distressed Parks
When a park is truly distressed (defaulting, physical deterioration, financial disarray), propose a structure where the buyer takes operational control with performance-based equity vesting. The buyer earns ownership through operational turnaround rather than purchase price. Dustin has used this structure on distressed acquisitions.

---

## PART 4: RV-SPECIFIC FACTORS

### 4.1 Five RV Park Types and Their Risk Profiles

| Type | Description | Failure Rate | Key Risk |
|------|-------------|-------------|----------|
| Transient/Nightly | Pure vacation, 1-7 night stays | Highest | Seasonal income, weather dependent |
| Community/Long-term | Monthly pads, 30+ day stays | Lowest | Tenant turnover on rent increases |
| Hybrid | Mix of nightly and monthly | Moderate | Operational complexity, dual systems |
| Resort/Destination | Premium amenities, high ADR | Moderate-High | Capital intensive, market dependent |
| Campground | Tent + basic RV, minimal hookups | High | Low margins, weather dependent |

**Management intensity:** RV parks require approximately 5x the management intensity of a comparable MHP. Nightly turnover, guest services, amenity maintenance, booking management, seasonal staffing — all multiply the operational burden.

### 4.2 Seasonal vs Year-Round Income Evaluation

- Request monthly P&L (hard stop if not available)
- Identify peak months, shoulder months, off-season months
- Calculate: peak revenue as % of annual total
- Calculate: off-season revenue as % of annual total
- If off-season revenue < 15% of peak monthly revenue, the park is essentially seasonal and should be underwritten as such
- Long-term stays cover debt service during off-season — this is the stability mechanism

### 4.3 Nightly vs Monthly Rate Mix

- Monthly rates typically 60-70% discount vs equivalent nightly rates
- Monthly tenants provide baseline income stability
- Nightly tenants provide higher per-night revenue
- Ideal mix varies by market but 30-40% long-term / 60-70% nightly is common for profitable parks
- **Rent increase exodus rate on long-term:** 20-30% of tenants will leave on significant increases. Budget for this in your underwriting.

### 4.4 Site Types and Relative Value

| Site Type | Relative Value | Notes |
|-----------|---------------|-------|
| Full hookup pull-through (50A) | Highest | Premium sites, highest demand |
| Full hookup back-in (50A) | High | Standard full-service |
| Full hookup (30A only) | Medium-High | Limits larger rigs |
| Water/Electric only | Medium | No sewer, lower demand |
| Dry camping / tent | Low | Minimal infrastructure, low rate |
| Cabins / glamping | Varies | Higher rate but higher expense ratio |

### 4.5 Tourism Dependency Risk

Parks dependent on a single tourism driver (one festival, one attraction, one season) carry concentration risk. Evaluate:
- What happens if that attraction closes or the event moves?
- Is the demand driver growing, stable, or declining?
- Are there secondary demand drivers within 30 miles?

### 4.6 Campground vs RV Park vs MHP Distinctions

| Factor | MHP | RV Park | Campground |
|--------|-----|---------|------------|
| Expense ratio | 30-40% | 50-60% | 55-65% |
| Cap rate spread over C-class | +2-2.5 pts | +3 pts | +3-4 pts |
| Management intensity | 1x | 5x | 5x+ |
| Lender vacancy assumption | 5-8% | 15-25% | 20-30% |
| LTV max | 70% | 65% | 60-65% |
| Sub-to viable | Yes (residential) | No (commercial) | No (commercial) |
| Bridge lending | Available | Difficult | Very difficult |
| Demand driver | Housing need | Tourism/lifestyle | Tourism/recreation |
| Revenue stability | High | Low-Moderate | Low |

---

## PART 5: INVESTMENT RETURN BENCHMARKS

### Target Returns (Dustin's Framework)

| Metric | Stabilized Deal | Value-Add Deal | Dustin's Closed Deals |
|--------|----------------|----------------|----------------------|
| IRR | 14-15% | 20%+ | ~24% average |
| Cash-on-Cash | 8-10% | 12-15% | Varies |
| Capital return | 75-100% at years 3-5 refi | 75-100% at years 3-5 refi | Same |

### Refinance Feasibility Test
Before closing, model the refinance at year 3-5:
- Projected NOI at stabilized operations
- Projected market cap rate at time of refi
- Projected LTV available (65% for RV parks)
- Will the refi proceeds return 75-100% of investor capital?
- If not, the deal may still work but the investor pitch changes

### Key Insight: 0% Interest Doesn't Fix Overpricing
Dustin demonstrated in a live proforma: even with 0% seller financing, an overpriced park still produces unacceptable returns. The purchase price drives IRR more than the interest rate. Don't let creative terms distract from fundamental valuation.

---

## PART 6: CONSERVATIVE UNDERWRITING DEFAULTS

Use these when actual data is unknown or unreliable.

| Metric | Default Value | Context |
|--------|--------------|---------|
| Nightly RV occupancy | 40% | Unknown market, no booking data |
| Monthly RV occupancy | 70% | Achievable with basic marketing |
| Tenant loss on rent increase | 20-30% | Budget for vacates when raising rents |
| New unit absorption (year 1) | 33% of planned | 8 of 24 planned units leased in year 1 |
| Expense ratio (park-owned structures) | 45% | Cabins, tiny homes, park-owned units |
| Expense ratio (tenant-owned RV pads only) | 35-40% | Minimal infrastructure |
| Expense ratio (mixed STR/RV) | 50-55% | Nightly + long-term mix |
| Expense ratio (long-term RV only) | 40-45% | All long-term stays |
| Expense ratio (transient/campground) | 50-60% | All nightly business |
| Stabilized vacancy | 4-5% | After year 2+ |
| R&M | 5-10% of revenue | Annual maintenance budget |
| Marketing | 2-3% of revenue | Booking platform fees + advertising |
| Reserves | $1,000-$1,500 per space | From day one, continuously replenished |
| Burn rate reserves (stabilization period) | $1,000 per space | Cover first 1-2 years of unexpected costs |

---

## PART 7: DUE DILIGENCE

### 7.1 Complete DD Document Request List (Dustin's Exhibit A)

This is the definitive list. Include as an exhibit in every purchase agreement. **Due diligence does not start until all requested items are received.** Put this in the PSA.

1. IRS Schedule E — past 2 years
2. Certified copies of last 24 months of bank statements
3. P&L — full year, broken down by month, last 2-3 years
4. Rent roll / Occupancy reports
5. Copies of all leases / guest stay agreements
6. Last 24 months of payment history from guests
7. All insurance policies
8. All licenses and permits
9. Any inspections (physical, financial, regulatory) — last 5 years
10. Any appraisals
11. All contracts with service providers (trash, pest, landscaping, cleaning, snow removal, security, septic)
12. All utility bills — last 24 months
13. Any pending or threatened lawsuits
14. Operating agreements (LLC/partnership — confirms ownership and sale authority)
15. Employee hiring contracts / employment agreements
16. Transfer disclosure statement (seller discloses known material defects)
17. Inventory list of all FF&E conveying with sale
18. List of all capital improvements — last 10 years or ownership period
19. Previous owner's disclosures (if owned less than 10 years)

### 7.2 DD Sequencing

**Phase 1 — Financial DD (first 30 days, free/cheap):**
- Forensic audit: cross-reference P&L against bank statements against tax returns
- Three-source financial cross-reference is non-negotiable
- If discrepancies found, renegotiate before proceeding to physical
- Live Zoom session: have seller screen-share booking software and bank portal so documents cannot be edited before sending
- Verify all lease agreements and match against rent roll
- For cash-heavy operations, collect individual lease agreements and sum expected rent vs bank deposits

**Phase 2 — Physical DD (days 30-60, costs $10-26K):**
- Sewer lines, water lines, electrical pedestals, all infrastructure
- Septic system inspection (if applicable) — expanded DD: pump, camera scope, leech field perc test
- Environmental: Phase I assessment even on small deals. Phase I triggers Phase II if contamination indicators found.
- Tree maintenance documentation (affects insurance claims)
- Verify every unit on the rent roll is actually occupied and paying
- Lapsed permits check — verify all operating permits are current

**Key rule:** DD clock does not start until ALL requested documents are received. State this explicitly in the purchase agreement.

### 7.3 Financial Red Flags

- **Straight-lined P&L = fabricated.** Real parks have seasonal variation. If every month shows identical revenue, the numbers are made up.
- **Proforma appraisals are not bankable.** Lenders underwrite on actual trailing 12-month P&L, not projections.
- **EBITDA + cost + sales stacked as valuation = invalid.** Income approach only. Never pay for potential.
- **Vague expense categories hiding payroll.** If "management" or "miscellaneous" is a large line item, payroll is buried in it.
- **Charitable donations listed as operating expense.** Remove from expense calculation — inflates NOI.
- **Capex hiding on balance sheet.** Major repairs classified as capital improvements rather than expenses to inflate NOI.
- **ChatGPT/AI-generated offering memorandums.** Increasingly common from small brokers. The OM format looks professional but underlying data is often fabricated. Always demand source financials.
- **Seller immediately agrees to every renegotiation.** If they accept your lower number without pushback, they have nothing to dispute — the original numbers were fake.
- **2020-2022 financials inflated.** Post-pandemic surge boosted RV park income temporarily. Discount those years and focus on 2023-2025 trailing actuals.

### 7.4 NDA Indemnification Red Flag
If a seller's NDA includes an indemnification clause making the buyer responsible for losses caused by information the seller provided, that's a major red flag. You're being asked to accept liability for the seller's own potentially fraudulent representations.

---

## PART 8: DEAL STRUCTURE

### 8.1 Three Counter-Offer Model

Every deal analysis includes three offer scenarios:

**Offer 1 — "What it's worth today"**
10 cap (or market cap rate) on current verified NOI. Fundamentals only. No credit for future improvements. This is the floor.

**Offer 2 — "Splitting the upside"**
Blended cap acknowledging achievable year-one improvements (rent increases, utility bill-back, vacancy fill). Buyer and seller share the projected value creation. Typically 5-15% above Offer 1.

**Offer 3 — "Make the price work with terms"**
Higher price with seller financing, extended due diligence, deferred payments (8-12 months no payments for distressed/poor-financials deals), or creative structure (equity retention, phased acquisition, master lease, split assets). The terms compensate for the premium.

### 8.2 Creative Finance Strategies

- **Seller carry with equity retention:** Seller finances at favorable terms but retains a small equity position (5-15%), benefiting from the buyer's operational improvements
- **Deferred payments:** 8-12 month no-payment period for distressed parks with limited financials — use that time to verify actual income
- **Master lease:** Operate the park under lease before purchasing — proves the income to both buyer and lender
- **Split assets:** Purchase the land/infrastructure separately from POH or notes
- **Phased acquisition:** Buy a percentage now, earn/buy the rest over time based on performance
- **Earnest money as DD leverage:** Structure earnest money as refundable during the full DD period, not just the inspection window

### 8.3 Seller Financing Negotiation

Ask for seller financing three times: at the beginning, middle, and end of negotiation (Justin Donald's framework). If the seller can't produce adequate financials for bank lending, seller financing may be their only path to a sale. Leverage this.

### 8.4 Loan Sponsor Requirements

For traditional commercial debt (not seller financing) over $1M:
- A loan sponsor with relevant asset class experience is required
- Sponsor needs sufficient net worth and liquidity relative to loan amount
- Sponsor typically receives 10-20% equity (sometimes bank-dictated)
- Deals under $1M may not require a sponsor
- First-time buyers will likely need personal guarantees regardless
- Avoid personal guarantees when possible — they compound risk on bad deals going forward

---

## PART 9: PROPERTY TAX & INSURANCE

### 9.1 Property Tax Reassessment *[Research]*

**Most counties reassess commercial property on sale.** If you buy at $2M and the current assessed value is $800K, expect property taxes to reset to the purchase price.

**Standard adjustment for every deal analysis:**

```
Post-Acquisition Property Tax Estimate:
  Current assessed value: $___
  Purchase price: $___
  Local tax rate (mill rate): ___%
  Current annual tax bill: $___
  Projected post-acquisition tax: Purchase Price × Tax Rate = $___
  Year 1 tax increase: $___
  Impact on NOI: reduce by $___
```

**State-specific risks:**
- **Texas:** Assessed values have increased up to 200% in two years. Reassessment on sale is aggressive. Dustin does not buy in TX.
- **California:** Prop 13 limits annual increases to 2%, but reassesses to market on sale. Supplemental property tax in year of purchase.
- **Florida:** Insurance + property tax combination makes FL deals much more expensive to hold than they appear. Dustin does not buy in FL.

### 9.2 Insurance Benchmarks *[Research]*

**General liability only:** $450-$1,500/year for $1M coverage (small park).

**Total insurance + property taxes combined:** 1-3% of property value annually.

**Default for underwriting:**
- Standard locations: 1.5-2% of property value
- Wildfire/hurricane/flood zones (FL, TX, CA, CO, MT): 2.5-3.5% of property value

**If seller's P&L shows insurance significantly below these ranges,** either they're underinsured, self-insuring certain buildings, or not reporting all policies. Verify by requesting copies of all insurance policies (DD item #7).

---

## PART 10: UTILITY ECONOMICS *[Research]*

### 10.1 Operating Utility Costs

**Per-site annual cost (owner's expense):** $200-$600 per site per year for water, electricity, sewage, and WiFi combined when utilities are billed separately.

**When utilities are included in rent:** Embedded cost approximately $75/site/month ($900/year). This represents the bill-back opportunity.

**Electricity metering:** Sub-metering at $0.15/kWh is becoming standard practice. Reduces owner expense and incentivizes guest conservation.

### 10.2 Bill-Back Value-Add Calculation

```
Bill-back opportunity:
  Number of sites with included utilities: ___
  Estimated embedded cost per site: $75/month
  Annual utility cost currently absorbed: Sites × $75 × 12 = $___
  Recovery rate (typically 70-85%): ___%
  Annual NOI improvement from bill-back: $___
  Value created at market cap rate: NOI improvement ÷ cap rate = $___
```

### 10.3 WiFi Infrastructure

Park-wide WiFi is now table-stakes for competitive parks. Budget $15,000-$35,000 for installation. Can be charged to guests ($50-75/month for long-term, $5-10/day for nightly) creating a new revenue stream.

---

## PART 11: ANCILLARY REVENUE *[Research]*

### 11.1 Revenue Mix Benchmark

Site rentals should account for 80%+ of gross income. Ancillary revenue (laundry, propane, camp store, amenity fees, storage, dump station) typically represents ~20% of total revenue.

### 11.2 Ancillary Revenue Defaults

| Stream | Revenue Potential | Margin | Notes |
|--------|------------------|--------|-------|
| Propane refills | $500-1,500/site/year (active parks) | High (40-60%) | Highest-margin ancillary |
| Laundry | $200-500/site/year | High (60-80%) | $40K capex for commercial equipment |
| Camp store | Varies widely | Low (10-30% after COGS) | Convenience, not profit center |
| RV/boat storage | $50-150/space/month | Very high | Passive income, minimal maintenance |
| Dump station (non-guests) | $5-25/use | Very high | Minimal incremental cost |
| Equipment rentals | Varies | Moderate | Golf carts, kayaks, bikes |
| Premium site upgrades | $10-20/night premium | Very high | Pull-through, waterfront, 50A |
| Glamping domes/units | $150-180/night | Moderate (45%) | $20K capex per dome, strong ROI |
| WiFi (charged) | $50-75/month (long-term) | High | After infrastructure investment |

### 11.3 Guest-to-Tenant Conversion

Timeline for converting nightly guests to monthly tenants: typically 3-6 months of relationship building and rate incentives. Monthly tenants provide baseline income stability that covers debt service during off-season.

---

## PART 12: PAD DEVELOPMENT COSTS

For expansion analysis and value-add modeling.

| Component | Cost Range | Notes |
|-----------|-----------|-------|
| Full hookup RV pad (total) | $10,000-65,000/pad | Wide range based on terrain and utilities |
| Electrical hookup (30/50A) | $500-7,000/site | Distance to main power source drives cost |
| Water connection | $700-15,000/site | Municipal vs well |
| Sewer connection | $2,000-12,000/site | Municipal vs septic |
| Gravel pad + basic site | $5,000-25,000/site | Grading, drainage, basic infrastructure |
| Paved pad + premium site | $20,000-50,000+/site | Asphalt, full hookups, landscaping |
| Septic system (park-wide) | $50,000-150,000+ | Soil conditions and capacity dependent |
| Ground-up park timeline | ~2 years | From permitting to first guest |

---

## PART 13: BOOKING SOFTWARE & TOOLS

| Tool | Use Case | Notes |
|------|----------|-------|
| Staylish | Booking management | Dustin uses for his parks |
| Campspot | Booking + dynamic pricing | Strong feature set |
| Campground Master | Booking + POS | Desktop-based, older platform |
| Rent Manager | MHP management | Not for nightly RV business |
| Co-Star | Market research | $500/mo — for serious operators only |
| Apartment Loan Store | Cap rate lookup | Free, suburban C-class as baseline |
| Crexi / LoopNet | Deal sourcing | Listings frequently mislabeled between MHP and RV |
| PropStream | Deal sourcing + data | $99/mo Essentials plan sufficient |
| bestplaces.net | Market DD | Demographics, employment, cost of living |

---

## PART 14: STATE-SPECIFIC NOTES

### States Dustin Avoids
- **Texas:** Property tax reassessment risk, insurance costs
- **Florida:** Insurance crisis, hurricane risk, property tax
- **Colorado:** First right of refusal law for MHP tenants, potentially extends to community-style RV parks with stays >30 days. Dustin removed CO from his RV park buy box.

### States Dustin Buys RV Parks
West Coast only: California, Oregon, Washington, Idaho, Utah, Nevada, Arizona

### States Dustin Buys MHPs
Broader geography: CA, AR, AL, MO, PA, OK, TN, WA, OR. Will buy 20+ space parks in CA. 40-50+ elsewhere.

### California-Specific
- Lower cap rates (6-8% common, not necessarily RED)
- Tiered occupancy law affects revenue modeling
- Supplemental property tax in year of purchase
- Prop 13 limits annual increases to 2% but reassesses on sale
- High-regulation state: add 5-10% to expense ratio
- Insurance rates skyrocketing, especially in wildfire zones

---

## PART 15: DUSTIN KERCHER'S BUY BOX (February 2026)

**RV Parks:**
- West Coast states only (CA, OR, WA, ID, UT, NV, AZ)
- No longer buying Colorado
- Preferably 70+ spaces, sweet spot 100+
- Very selective

**Mobile Home Parks:**
- Broader geography (CA, AR, AL, MO, PA, OK, TN, WA, OR)
- Will buy 20+ space parks in CA
- 40-50+ spaces elsewhere
- Will add adjacent parks to existing portfolio regardless of size
- Does not buy TX or FL
- Prefers MHP over RV parks

**Finders fees:** $20-100K typical. Has paid $1M for an exceptional deal.

---

## PART 16: KEY DIVERGENCES — RV PARKS vs MOBILE HOME PARKS

| Factor | MHP | RV Park |
|--------|-----|---------|
| Expense ratio | 30-40% | 50-60% |
| Cap rate spread | +2-2.5 pts over C-class | +3 pts over C-class |
| Management intensity | 1x (baseline) | 5x |
| Lender vacancy assumption | 5-8% | 15-25% |
| LTV max | 70% | 65% |
| Sub-to | Viable (residential debt) | Not viable (commercial debt) |
| Bridge lending | Available | Difficult |
| Demand driver | Housing (always needed) | Tourism/lifestyle (variable) |
| Revenue stability | High | Low-Moderate |
| Monthly P&L required | Preferred | Mandatory |
| Reserves per space | $500-1,000 | $1,000-1,500 |
| Pad count floor | 50 (hard) | 30 (soft) / 50 (preferred) |
| Staffing per 100 sites | 1-2 people | 4-6 people |
| Seasonality risk | Low | High |

---

## APPENDIX A: SCORING PARAMETERS FOR PIPELINE CONFIG

These map directly to `config.js` for the RV mode of the deal sourcing pipeline.

### Hard Stop Filters (auto-RED)
```
rv_hard_stops:
  demand_driver_required: true
  min_county_pop: 10000  # soft — passes with nearby town >25K
  max_distance_walmart_minutes: 60
  monthly_pnl_required: true
  max_price_to_value_ratio: 1.30
```

### Scoring Thresholds
```
rv_scoring:
  cap_rate:
    green: >= 0.10
    yellow: 0.08 - 0.10
    red: < 0.08
  peak_occupancy:
    green: >= 0.90
    yellow: 0.70 - 0.90
    red: < 0.70
  off_season_occupancy:
    green: >= 0.40
    yellow: 0.20 - 0.40
    red: < 0.20
  revenue_concentration_flag: > 0.40  # single source as % of NOI
  pad_count:
    preferred: >= 50
    minimum: >= 30
    below_minimum: GRAY  # wrong buy box, not RED
```

### Default Expense Ratios
```
rv_expense_defaults:
  transient_campground: 0.55
  long_term_only: 0.45
  mixed_str_rv: 0.525
  tenant_owned_pads_only: 0.375
  park_owned_structures: 0.45
  small_park_adder: 0.05  # parks < 50 sites
  high_reg_state_adder: 0.075  # CA, NY, PA
```

### Reserve Requirements
```
rv_reserves:
  per_space: 1250  # midpoint of $1,000-1,500
  burn_rate_per_space: 1000  # first 1-2 years
```

### Cap Rate Derivation
```
rv_cap_rate:
  base: "apartment_loan_store_suburban_c_class"
  rv_spread: 3.0  # points added for RV parks
  mhp_spread: 2.25  # points added for MHPs
  rural_adder: 0.75  # additional points for markets too small to appear
```

---

## APPENDIX B: THREE COUNTER-OFFER TEMPLATE

```
OFFER 1 — CURRENT VALUE
  NOI (verified): $___
  Market cap rate: ___%
  Valuation: NOI ÷ cap rate = $___
  Less capex deduction: -$___
  Offer price: $___

OFFER 2 — BLENDED VALUE
  Current NOI: $___
  Year 1 achievable NOI increase: $___
  Blended NOI: $___
  Cap rate: ___%
  Valuation: $___
  Offer price: $___

OFFER 3 — TERMS-BASED
  Offer price: $___ (at or near asking)
  Seller financing: __% at __% for __ years
  Deferred payments: __ months
  Extended DD: __ days
  Other creative terms: ___
  Effective yield to buyer: ___%
```

---

*Framework compiled April 2026 from 8 Dustin Kercher underwriting session transcripts (Subto community, January-March 2026) plus industry research. All thresholds, benchmarks, and methodologies attributed to Kercher unless marked [Research]. This document is proprietary to Ian Titus / Battle Field Development Group LLC. The framework stays behind the curtain — analysis outputs only, never the scoring criteria.*

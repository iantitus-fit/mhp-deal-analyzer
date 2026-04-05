import { useState, useMemo, useEffect, useCallback } from "react";

const TABS = ["Analyzer", "Scorecard", "Value-Add", "Market Check"];
const STORAGE_KEY = "mhp-deals";

const fmtCurrency = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "\u2014";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
};

const fmtPct = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "\u2014";
  return (n * 100).toFixed(1) + "%";
};

// Asset Type Configurations
const ASSET_CONFIGS = {
  mhp: {
    label: "Mobile Home Park",
    shortLabel: "MHP",
    capRateSpread: 2.25,
    expenseOptions: [
      { value: "tenant", label: "Tenants pay direct (30% expense)", ratio: 0.70 },
      { value: "park", label: "Park pays / included (40% expense)", ratio: 0.60 },
    ],
    lotLabel: "Lots",
    rentLabel: "Lot Rent",
    pohEnabled: true,
    pohValues: { "70s": 3000, "80s": 5000, "90s": 10000, "2000s": 15000 },
    reservePerSpace: 1000,
  },
  rv: {
    label: "RV Park",
    shortLabel: "RV",
    capRateSpread: 3.0,
    expenseOptions: [
      { value: "longterm", label: "Long-term only (45% expense)", ratio: 0.55 },
      { value: "mixed", label: "Mixed nightly + monthly (48% expense)", ratio: 0.52 },
      { value: "transient", label: "Transient / campground (55% expense)", ratio: 0.45 },
      { value: "to_only", label: "Tenant-owned pads only (38% expense)", ratio: 0.62 },
      { value: "owned_structures", label: "Park-owned structures (45% expense)", ratio: 0.55 },
    ],
    lotLabel: "Sites",
    rentLabel: "Site Rent",
    pohEnabled: false,
    reservePerSpace: 1250,
  },
  slowflip: {
    label: "Slow Flip",
    shortLabel: "SF",
    accentColor: "#16a34a",
    useCustomCalculator: true,
    defaults: {
      purchasePrice: 30000, lenderAmount: 30000, lenderRate: 12, lenderTermMonths: 60,
      salePrice: 89000, buyerDownPayment: 3000, buyerMonthlyPayment: 875, buyerTermMonths: 360,
      closingCostEstimate: 900, monthlyTaxes: 0, monthlyInsurance: 0,
    },
  },
};

const MHP_CRITERIA = [
  { id: 1, name: "Legal Park", desc: "Confirmed legal or legal non-conforming. Call city building inspector.", hard: true },
  { id: 2, name: "Location", desc: "Avoid Deep South (except ATL, Birmingham). Avoid pro-tenant states (NY, NJ, CA). No rent control.", hard: true },
  { id: 3, name: "Size (50+ lots)", desc: "50-100+ units ideal. Same work for 25 as 50. Better exit options.", hard: true },
  { id: 4, name: "City Utilities", desc: "City water + city sewer. No well water, lagoons, treatment plants, or master meter electric/gas.", hard: true },
  { id: 5, name: "MSA 100K+ Population", desc: "Metro area must be 100K+. Diversified employers, not a one-trick pony town.", hard: true },
  { id: 6, name: "Cap Rate >= 10", desc: "Buy at 10 cap or buy at 8-9 with clear plan to reach 10.", hard: false },
  { id: 7, name: "Cash-on-Cash >= 20%", desc: "Need 3-point spread between interest rate and cap rate.", hard: false },
  { id: 8, name: "Occupancy >= 70%", desc: "Banks require 70%+ for stabilized lending. 80%+ preferred.", hard: false },
  { id: 9, name: "Few Park-Owned Homes", desc: "Fewer = less expense. Lot-rent-only is the goal.", hard: false },
  { id: 10, name: "Purchase Price in Range", desc: "Fits your capital or can find money for a great deal.", hard: false },
];

const RV_CRITERIA = [
  { id: 1, name: "Demand Driver Identified", desc: "Tourism, employment, recreation, military, university, or highway corridor. Ghost ad test if uncertain.", hard: true },
  { id: 2, name: "Population (County 10K+ or nearby 25K+)", desc: "County pop >=10K or town >25K within 30min. Exception: dominant tourism driver verified.", hard: true },
  { id: 3, name: "Within 60min of Walmart/Home Depot", desc: "Workforce and supply chain proxy.", hard: true },
  { id: 4, name: "Monthly P&L Available", desc: "Annual-only insufficient for RV. Must see monthly to evaluate seasonality.", hard: true },
  { id: 5, name: "Price Within 130% of Value", desc: "If asking exceeds 130% of NOI/cap-rate value, too far to negotiate.", hard: true },
  { id: 6, name: "Cap Rate >= 10% (West Coast 8%+)", desc: "C-class + 3pts. Rural add 0.5-1pt. CA/coastal may trade lower.", hard: false },
  { id: 7, name: "Expense Ratio Verified", desc: "Transient: 50-60%. Long-term: 40-50%. Below 40% = P&L incomplete.", hard: false },
  { id: 8, name: "Peak Occupancy >= 70%", desc: "Best 3-4 months. GREEN 90%+. Off-season: GREEN 40%+.", hard: false },
  { id: 9, name: "Staffing Costed at Replacement", desc: "If owner manages, add GM cost ($60-120K). Work campers != staffing plan.", hard: false },
  { id: 10, name: "Revenue Segmented (<40% concentration)", desc: "Strip RTO income. Value on lot rent only. Flag >40% single source.", hard: false },
  { id: 11, name: "DSCR >= 1.25x on Current NOI", desc: "Must cash flow day one. Check worst 3 months individually.", hard: false },
  { id: 12, name: "Reserves ($1,000-1,500/space)", desc: "Raised at acquisition. Replenished continuously. Separate from capex.", hard: false },
];

const SF_CRITERIA = [
  { id: 1, name: "Cash Flow Not Negative", desc: "Buyer payment >= lender payment + taxes + insurance. NEVER go negative.", hard: true },
  { id: 2, name: "Not Using Personal Savings", desc: "Private money or seller financing, not personal capital as primary funding.", hard: true },
  { id: 3, name: "Lender Term <= 60 Months", desc: "5-year max payoff. Longer defeats the model.", hard: true },
  { id: 4, name: "Viable Slow Flip Market", desc: "Comps support resale price. Buyer payment competitive with local rents.", hard: true },
  { id: 5, name: "Clean Title Obtainable", desc: "Title search shows clear or resolvable liens. Liens below purchase price OK.", hard: true },
  { id: 6, name: "Purchase Price", desc: "GREEN: <= $30K. YELLOW: $30K-$50K. RED: > $50K.", hard: false },
  { id: 7, name: "Sale Price vs Market", desc: "GREEN: <= 3x purchase + comps. YELLOW: 3-3.5x or limited comps. RED: > 3.5x or no comps.", hard: false },
  { id: 8, name: "Buyer Down Payment", desc: "GREEN: >= $5K. YELLOW: $3K-$5K. RED: < $3K.", hard: false },
  { id: 9, name: "Monthly Collection", desc: "GREEN: >= $875. YELLOW: $750-$874. RED: < $750.", hard: false },
  { id: 10, name: "Pocket Money at Closing", desc: "GREEN: positive. YELLOW: break-even +/- $500. RED: negative (you bring cash).", hard: false },
  { id: 11, name: "Seller Motivation", desc: "GREEN: distressed/absentee/tax delinquent/estate. YELLOW: listed w/ agent. RED: full retail.", hard: false },
  { id: 12, name: "Property Condition", desc: "GREEN: cosmetic work only. YELLOW: major systems (roof, HVAC). RED: condemned/fire/environmental.", hard: false },
];

const MHP_MARKET_CHECKS = [
  { cat: "Population & Economy", items: [
    { label: "MSA Pop >= 100,000", source: "bestplaces.net", id: "pop" },
    { label: "Unemployment below US avg", source: "bestplaces.net", id: "unemp" },
    { label: "Diversified employers", source: "Wikipedia", id: "emp" },
    { label: "No single-employer dependency", source: "#1 not 4x bigger than #2", id: "dep" },
    { label: "Walmart nearby", source: "Google Maps", id: "walmart" },
  ]},
  { cat: "Housing Market", items: [
    { label: "Median home >= $100K", source: "bestplaces.net", id: "homeprice" },
    { label: "2BR rent >= $600", source: "bestplaces.net", id: "apt2" },
    { label: "Vacancy < 12.5%", source: "bestplaces.net", id: "vacancy" },
  ]},
  { cat: "Park Specifics", items: [
    { label: "City water (not well)", source: "Seller / DD", id: "water" },
    { label: "City sewer (not lagoon)", source: "Seller / DD", id: "sewer" },
    { label: "No master meter electric", source: "Check meter", id: "elec" },
    { label: "Density <= 15 units/acre", source: "Plat map", id: "density" },
    { label: "Not pro-tenant state", source: "Avoid NY, NJ, CA", id: "state" },
  ]},
  { cat: "Deal Signals", items: [
    { label: "Lot rent $125-$200 (under market)", source: "Comps", id: "lotrent" },
    { label: "Total home+lot <= $500/mo", source: "Affordability", id: "afford" },
    { label: "Seller finance possible", source: "Ask 3 times", id: "sf" },
  ]},
];

const RV_MARKET_CHECKS = [
  { cat: "Demand & Location", items: [
    { label: "Demand driver verified", source: "Ghost ad, Google Trends, tourism data", id: "demand" },
    { label: "County pop >= 10K or nearby town > 25K", source: "bestplaces.net / Census", id: "pop" },
    { label: "Walmart/Home Depot within 60 min", source: "Google Maps", id: "walmart" },
    { label: "Not single-event dependent", source: "Secondary demand drivers?", id: "eventdep" },
    { label: "Review density on Google/Campendium", source: "Active market signal", id: "reviews" },
  ]},
  { cat: "Financial Verification", items: [
    { label: "Monthly P&L (not annual-only)", source: "Hard stop", id: "monthlypnl" },
    { label: "Revenue segmented by source", source: "Lot rent, nightly, monthly, RTO, ancillary", id: "revsegment" },
    { label: "Expense ratio matches park type", source: "Transient 50-60%, Long-term 40-50%", id: "expratio" },
    { label: "Payroll on P&L", source: "Zero payroll = owner doing work", id: "payroll" },
    { label: "Not straight-lined", source: "Identical months = fabricated", id: "straightline" },
    { label: "2020-2022 discounted", source: "Post-pandemic RV surge inflated", id: "covidinflate" },
  ]},
  { cat: "Park Specifics", items: [
    { label: "City water + sewer", source: "Septic adds 5% expense", id: "water" },
    { label: "Full hookups (50A + 30A)", source: "Premium rate capability", id: "hookups" },
    { label: "WiFi infrastructure", source: "$15-35K if missing", id: "wifi" },
    { label: "Booking software in use", source: "Staylish, Campspot, etc.", id: "bookingsw" },
    { label: "No lapsed permits", source: "Verify current", id: "permits" },
    { label: "Insurance 1.5-3.5% of value", source: "Request all policies", id: "insurance" },
    { label: "Property tax reassessment modeled", source: "Assessed vs purchase price", id: "taxreset" },
  ]},
  { cat: "Operational", items: [
    { label: "Staffing realistic (not work-camper)", source: "1 GM + 1-1.5 maint per 70-100 sites", id: "staffing" },
    { label: "Seasonal DSCR passes", source: "Worst 3 months > debt service", id: "seasonaldscr" },
    { label: "Reserves budgeted ($1K-1.5K/space)", source: "Raised at acquisition", id: "reserves" },
    { label: "Capex separate from operations", source: "Never fund Y1-Y2 from cash flow", id: "capex" },
    { label: "Seller finance asked 3x", source: "Beginning, middle, end", id: "sf" },
  ]},
];

const SF_MARKET_CHECKS = [
  { cat: "Market Viability", items: [
    { label: "Houses available under $50K in target market", source: "Zillow, Realtor.com, PropStream", id: "sf_inventory" },
    { label: "Comps confirm $30K purchase is realistic", source: "Sold homes in area", id: "sf_comps" },
    { label: "Rental rates support $875+/mo payment", source: "Payment competitive with local rents", id: "sf_rents" },
    { label: "Population stable or growing", source: "bestplaces.net / Census", id: "sf_pop" },
    { label: "Within 3-5 hours of home base (or local infrastructure)", source: "Attorney, title co, sign person", id: "sf_distance" },
  ]},
  { cat: "Property Due Diligence", items: [
    { label: "Title search completed — clean or resolvable", source: "Title company", id: "sf_title" },
    { label: "Property taxes current or amount known", source: "County records", id: "sf_taxes" },
    { label: "No active code violations preventing occupancy", source: "City/county code enforcement", id: "sf_codes" },
    { label: "Physical condition assessed — livable or near-livable", source: "Drive-by or video", id: "sf_condition" },
    { label: "Insurance quote obtained (cash value, 2x purchase)", source: "Insurance agent", id: "sf_insurance" },
  ]},
  { cat: "Legal & Infrastructure", items: [
    { label: "Owner financing legal in target state", source: "Attorney confirmation", id: "sf_legal" },
    { label: "Real estate attorney identified", source: "For closings", id: "sf_attorney" },
    { label: "Title company identified", source: "Title search + insurance", id: "sf_titleco" },
    { label: "State disclosure requirements understood", source: "Lead paint, seller disclosures", id: "sf_disclosures" },
    { label: "Land contract template reviewed by attorney", source: "Agreement for deed", id: "sf_contract" },
  ]},
  { cat: "Deal Execution", items: [
    { label: "Private money lender identified", source: "12% / $30K / 60mo", id: "sf_lender" },
    { label: "Marketing plan ready", source: "Signs, FB Marketplace, Craigslist, video", id: "sf_marketing" },
    { label: "Lockbox purchased for self-showing", source: "Install at closing", id: "sf_lockbox" },
    { label: "Google Voice number set up", source: "Property-specific number", id: "sf_phone" },
    { label: "Buyer qualification approach decided", source: "First-come-first-served recommended", id: "sf_qualification" },
  ]},
];

function defaultDeal() {
  return {
    id: crypto.randomUUID(), name: "", assetType: "mhp", createdAt: new Date().toISOString(),
    analyzer: { lots: 50, lotRent: 200, utilPayer: "tenant", parkType: "mixed", targetCap: 10, pohCount: 5, pohDecade: "90s", askingPrice: 900000, interestRate: 5, seasonalWorstPct: 50, purchasePrice: 30000, lenderAmount: 30000, lenderRate: 12, lenderTermMonths: 60, salePrice: 89000, buyerDownPayment: 3000, buyerMonthlyPayment: 875, buyerTermMonths: 360, closingCostEstimate: 900, monthlyTaxes: 0, monthlyInsurance: 0 },
    scorecard: {},
    valueAdd: { currentLots: 50, currentRent: 175, marketRent: 280, currentOccupancy: 70, targetOccupancy: 90, utilPayer: "park", capRate: 10, utilCostPerSite: 75, freedomTarget: 10000, existingProperties: 0, existingMonthlyIncome: 0, monthsToAcquire: 2 },
    marketCheck: { states: {}, zip: "", firecrawlKey: "", marketData: null },
  };
}

function loadDeals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(d => ({ ...defaultDeal(), ...d, assetType: d.assetType || "mhp" })); }
  } catch {}
  return [defaultDeal()];
}
function saveDeals(deals) { localStorage.setItem(STORAGE_KEY, JSON.stringify(deals)); }

function Input({ label, value, onChange, type = "number", prefix, suffix, hint, small, placeholder }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a9bb5", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 0, background: "#1a2235", borderRadius: 6, border: "1px solid #2a3a52", overflow: "hidden" }}>
        {prefix && <span style={{ padding: "8px 0 8px 10px", color: "#5a7a9e", fontSize: 14, fontWeight: 600 }}>{prefix}</span>}
        <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e8edf5", padding: prefix ? "8px 10px 8px 4px" : "8px 10px", fontSize: small ? 13 : 15, fontFamily: "'JetBrains Mono', 'SF Mono', monospace", width: small ? 70 : "100%", minWidth: 0 }} />
        {suffix && <span style={{ padding: "8px 10px 8px 0", color: "#5a7a9e", fontSize: 12, fontWeight: 500 }}>{suffix}</span>}
      </div>
      {hint && <div style={{ fontSize: 10, color: "#5a7a9e", marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

function Select({ label, value, onChange, options, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a9bb5", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", background: "#1a2235", border: "1px solid #2a3a52", borderRadius: 6, color: "#e8edf5", padding: "8px 10px", fontSize: 14, outline: "none", cursor: "pointer" }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <div style={{ fontSize: 10, color: "#5a7a9e", marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

function ResultCard({ label, value, sub, accent }) {
  const bg = accent === "green" ? "#0d3326" : accent === "amber" ? "#332b0d" : accent === "red" ? "#331414" : "#1a2235";
  const border = accent === "green" ? "#1a6b4a" : accent === "amber" ? "#6b5a1a" : accent === "red" ? "#6b1a1a" : "#2a3a52";
  const color = accent === "green" ? "#4ade80" : accent === "amber" ? "#fbbf24" : accent === "red" ? "#f87171" : "#60a5fa";
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "14px 16px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: "#8a9bb5", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#6b7f99", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 style={{ fontSize: 13, fontWeight: 700, color: "#8a9bb5", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, marginTop: 22, borderBottom: "1px solid #1e2d42", paddingBottom: 8 }}>{children}</h3>;
}

function calcMonthlyPayment(principal, annualRate, termMonths) {
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / termMonths;
  return principal * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

function calcImpliedRate(principal, monthlyPayment, termMonths) {
  let rate = 0.01;
  for (let i = 0; i < 100; i++) {
    const r = rate;
    const pmt = principal * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
    const dPmt = principal * (
      (Math.pow(1+r, termMonths) + r * termMonths * Math.pow(1+r, termMonths-1)) * (Math.pow(1+r, termMonths) - 1) -
      r * Math.pow(1+r, termMonths) * termMonths * Math.pow(1+r, termMonths-1)
    ) / Math.pow(Math.pow(1+r, termMonths) - 1, 2);
    if (Math.abs(dPmt) < 0.0001) break;
    rate = r - (pmt - monthlyPayment) / dPmt;
    if (Math.abs(pmt - monthlyPayment) < 0.01) break;
  }
  return rate * 12 * 100;
}

function SlowFlipAnalyzer({ data, update }) {
  const { purchasePrice, lenderAmount, lenderRate, lenderTermMonths, salePrice, buyerDownPayment, buyerMonthlyPayment, buyerTermMonths, closingCostEstimate, monthlyTaxes, monthlyInsurance } = data;
  const set = (key) => (val) => update({ ...data, [key]: val });

  const lenderPayment = calcMonthlyPayment(lenderAmount, lenderRate, lenderTermMonths);
  const pocketMoney = lenderAmount - purchasePrice - closingCostEstimate;
  const monthlyCF15 = buyerMonthlyPayment - lenderPayment - monthlyTaxes - monthlyInsurance;
  const monthlyCF6 = buyerMonthlyPayment - monthlyTaxes - monthlyInsurance;
  const buyerFinanced = salePrice - buyerDownPayment;
  const impliedRate = buyerFinanced > 0 && buyerMonthlyPayment > 0 && buyerTermMonths > 0 ? calcImpliedRate(buyerFinanced, buyerMonthlyPayment, buyerTermMonths) : 0;
  const totalPayout = buyerMonthlyPayment * buyerTermMonths + buyerDownPayment;
  const totalReturn = totalPayout - lenderAmount;
  const freedomPct = monthlyCF6 > 0 ? (monthlyCF6 / 10000) * 100 : 0;
  const saleRatio = purchasePrice > 0 ? salePrice / purchasePrice : 0;

  let verdict, verdictColor;
  if (monthlyCF15 < 0) { verdict = "DO NOT BUY"; verdictColor = "#f87171"; }
  else if (monthlyCF15 <= 50) { verdict = "TIGHT — LOW MARGIN"; verdictColor = "#fbbf24"; }
  else if (purchasePrice > 50000) { verdict = "ABOVE CEILING"; verdictColor = "#fbbf24"; }
  else if (saleRatio > 3.5) { verdict = "MAY BE UNREALISTIC"; verdictColor = "#fbbf24"; }
  else { verdict = "FORMULA WORKS"; verdictColor = "#4ade80"; }

  return (
    <div>
      <SectionTitle>Purchase Side</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Input label="Purchase Price" value={purchasePrice} onChange={set("purchasePrice")} prefix="$" />
        <Input label="Lender Amount" value={lenderAmount} onChange={set("lenderAmount")} prefix="$" />
        <Input label="Lender Rate" value={lenderRate} onChange={set("lenderRate")} suffix="%" />
        <Input label="Lender Term" value={lenderTermMonths} onChange={set("lenderTermMonths")} suffix="months" />
      </div>
      <SectionTitle>Sale Side</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Input label="Sale Price" value={salePrice} onChange={set("salePrice")} prefix="$" />
        <Input label="Buyer Down Payment" value={buyerDownPayment} onChange={set("buyerDownPayment")} prefix="$" />
        <Input label="Buyer Monthly Payment" value={buyerMonthlyPayment} onChange={set("buyerMonthlyPayment")} prefix="$" suffix="/mo" />
        <Input label="Buyer Term" value={buyerTermMonths} onChange={set("buyerTermMonths")} suffix="months" />
      </div>
      <SectionTitle>Carrying Costs</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Input label="Monthly Taxes" value={monthlyTaxes} onChange={set("monthlyTaxes")} prefix="$" suffix="/mo" />
        <Input label="Monthly Insurance" value={monthlyInsurance} onChange={set("monthlyInsurance")} prefix="$" suffix="/mo" />
        <Input label="Closing Cost Estimate" value={closingCostEstimate} onChange={set("closingCostEstimate")} prefix="$" />
      </div>
      <SectionTitle>Deal Numbers</SectionTitle>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <ResultCard label="Lender Payment" value={fmtCurrency(lenderPayment)} sub={`${lenderRate}% / ${lenderTermMonths}mo`} />
        <ResultCard label="Pocket Money at Closing" value={fmtCurrency(pocketMoney)} sub={pocketMoney >= 0 ? "Cash to you" : "You bring cash"} accent={pocketMoney > 0 ? "green" : pocketMoney >= -500 ? "amber" : "red"} />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <ResultCard label="Monthly CF (Yr 1-5)" value={fmtCurrency(monthlyCF15)} sub={monthlyCF15 < 0 ? "NEGATIVE — DO NOT BUY" : `After lender + carrying`} accent={monthlyCF15 < 0 ? "red" : monthlyCF15 <= 50 ? "amber" : "green"} />
        <ResultCard label="Monthly CF (Yr 6+)" value={fmtCurrency(monthlyCF6)} sub="Freedom income — lender paid off" accent="green" />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <ResultCard label="Buyer Implied Rate" value={impliedRate.toFixed(1) + "%"} sub={`On $${buyerFinanced.toLocaleString()} financed`} />
        <ResultCard label="30-Year Total Payout" value={fmtCurrency(totalPayout)} sub={`${buyerTermMonths}mo x $${buyerMonthlyPayment} + $${buyerDownPayment} down`} />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <ResultCard label="Total Return" value={fmtCurrency(totalReturn)} sub={`Payout minus lender`} accent="green" />
        <ResultCard label="Freedom Number" value={freedomPct.toFixed(1) + "%"} sub={`${fmtCurrency(monthlyCF6)}/mo of $10K target`} accent={freedomPct >= 10 ? "green" : "amber"} />
      </div>
      <div style={{ marginTop: 20, padding: "16px", background: "#111827", borderRadius: 10, border: "1px solid #1e2d42", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#5a7a9e", fontWeight: 600, marginBottom: 6 }}>VERDICT</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: verdictColor }}>{verdict}</div>
      </div>
      <div style={{ marginTop: 16, padding: "12px 14px", background: "#111827", borderRadius: 8, border: "1px solid #1e2d42" }}>
        <div style={{ fontSize: 11, color: "#5a7a9e", fontWeight: 600, marginBottom: 6 }}>DEAL SUMMARY</div>
        <div style={{ fontSize: 12, color: "#8a9bb5", fontFamily: "monospace", lineHeight: 1.8 }}>
          Buy @ <span style={{ color: "#60a5fa" }}>{fmtCurrency(purchasePrice)}</span> with <span style={{ color: "#60a5fa" }}>{fmtCurrency(lenderAmount)}</span> private money @ {lenderRate}%/{lenderTermMonths}mo<br />
          Sell @ <span style={{ color: "#4ade80" }}>{fmtCurrency(salePrice)}</span> — ${buyerDownPayment.toLocaleString()} down + ${buyerMonthlyPayment}/mo x {buyerTermMonths}mo<br />
          Pocket <span style={{ color: pocketMoney >= 0 ? "#4ade80" : "#f87171" }}>{fmtCurrency(pocketMoney)}</span> at closing | CF <span style={{ color: monthlyCF15 >= 0 ? "#4ade80" : "#f87171" }}>{fmtCurrency(monthlyCF15)}</span>/mo yr 1-5 | <span style={{ color: "#4ade80" }}>{fmtCurrency(monthlyCF6)}</span>/mo yr 6+
        </div>
      </div>
    </div>
  );
}

function SlowFlipValueAdd({ data, update, analyzerData }) {
  const set = (key) => (val) => update({ ...data, [key]: val });
  const { freedomTarget, existingProperties, existingMonthlyIncome, monthsToAcquire } = data;
  const { purchasePrice, lenderAmount, lenderRate, lenderTermMonths, salePrice, buyerDownPayment, buyerMonthlyPayment, buyerTermMonths, closingCostEstimate, monthlyTaxes, monthlyInsurance } = analyzerData;

  // Base deal numbers
  const baseLenderPmt = calcMonthlyPayment(lenderAmount, lenderRate, lenderTermMonths);
  const baseCF15 = buyerMonthlyPayment - baseLenderPmt - monthlyTaxes - monthlyInsurance;
  const baseCF6 = buyerMonthlyPayment - monthlyTaxes - monthlyInsurance;
  const basePocket = lenderAmount - purchasePrice - closingCostEstimate;

  // Scenario 1: Buy Lower (-$5K)
  const s1Purchase = purchasePrice - 5000;
  const s1Lender = lenderAmount - 5000;
  const s1LenderPmt = calcMonthlyPayment(s1Lender, lenderRate, lenderTermMonths);
  const s1CF15 = buyerMonthlyPayment - s1LenderPmt - monthlyTaxes - monthlyInsurance;
  const s1Pocket = s1Lender - s1Purchase - closingCostEstimate;

  // Scenario 2: Sell Higher (+$10K)
  const s2Sale = salePrice + 10000;
  const s2BuyerPmt = buyerMonthlyPayment + 30;
  const s2CF15 = s2BuyerPmt - baseLenderPmt - monthlyTaxes - monthlyInsurance;

  // Scenario 3: Better Terms (10% rate, 8% lender)
  const s3LenderPmt = calcMonthlyPayment(lenderAmount, 8, lenderTermMonths);
  const s3CF15 = buyerMonthlyPayment - s3LenderPmt - monthlyTaxes - monthlyInsurance;

  // Freedom calculator
  const target = freedomTarget || 10000;
  const remaining = Math.max(0, target - (existingMonthlyIncome || 0));
  const propertiesNeeded = baseCF6 > 0 ? Math.ceil(remaining / baseCF6) : 0;
  const totalMonths = propertiesNeeded * (monthsToAcquire || 2);
  const freedomDate = new Date();
  freedomDate.setMonth(freedomDate.getMonth() + totalMonths);
  const progressPct = target > 0 ? Math.min(((existingMonthlyIncome || 0) / target) * 100, 100) : 0;

  // Portfolio from localStorage
  const [portfolio, setPortfolio] = useState([]);
  useEffect(() => {
    try {
      const allDeals = JSON.parse(localStorage.getItem("mhp-deals") || "[]");
      setPortfolio(allDeals.filter(d => d.assetType === "slowflip"));
    } catch {}
  }, []);

  const Scenario = ({ title, cf, delta, extra }) => (
    <div style={{ background: "#111827", border: "1px solid #1e2d42", borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e8edf5", marginBottom: 6 }}>{title}</div>
      <div style={{ display: "flex", gap: 12 }}>
        <div><span style={{ fontSize: 11, color: "#5a7a9e" }}>CF Yr 1-5: </span><span style={{ fontSize: 13, fontWeight: 700, color: cf >= 0 ? "#4ade80" : "#f87171", fontFamily: "monospace" }}>{fmtCurrency(cf)}</span></div>
        <div><span style={{ fontSize: 11, color: "#5a7a9e" }}>vs Base: </span><span style={{ fontSize: 13, fontWeight: 700, color: delta >= 0 ? "#4ade80" : "#f87171", fontFamily: "monospace" }}>{delta >= 0 ? "+" : ""}{fmtCurrency(delta)}</span></div>
      </div>
      {extra && <div style={{ fontSize: 11, color: "#6b7f99", marginTop: 4 }}>{extra}</div>}
    </div>
  );

  return (
    <div>
      <SectionTitle>Deal Optimization</SectionTitle>
      <Scenario title="Buy Lower (-$5K)" cf={s1CF15} delta={s1CF15 - baseCF15} extra={`Purchase: ${fmtCurrency(s1Purchase)} | Pocket: ${fmtCurrency(s1Pocket)} (${s1Pocket >= basePocket ? "+" : ""}${fmtCurrency(s1Pocket - basePocket)})`} />
      <Scenario title="Sell Higher (+$10K, +$30/mo)" cf={s2CF15} delta={s2CF15 - baseCF15} extra={`Sale: ${fmtCurrency(s2Sale)} | Buyer pmt: $${s2BuyerPmt}/mo`} />
      <Scenario title="Better Terms (8% lender)" cf={s3CF15} delta={s3CF15 - baseCF15} extra={`Lender pmt: ${fmtCurrency(s3LenderPmt)} vs ${fmtCurrency(baseLenderPmt)}`} />

      <SectionTitle>Freedom Number Calculator</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Input label="Monthly Freedom Target" value={freedomTarget} onChange={set("freedomTarget")} prefix="$" suffix="/mo" />
        <Input label="Existing Properties" value={existingProperties} onChange={set("existingProperties")} />
        <Input label="Existing Monthly Income" value={existingMonthlyIncome} onChange={set("existingMonthlyIncome")} prefix="$" suffix="/mo" />
        <Input label="Months to Acquire Each" value={monthsToAcquire} onChange={set("monthsToAcquire")} suffix="months" />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <ResultCard label="Remaining Needed" value={fmtCurrency(remaining)} sub={`of ${fmtCurrency(target)}/mo target`} />
        <ResultCard label="Properties Needed" value={propertiesNeeded} sub={`@ ${fmtCurrency(baseCF6)}/mo each (yr 6+)`} accent={propertiesNeeded <= 12 ? "green" : "amber"} />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <ResultCard label="Timeline" value={`${totalMonths} months`} sub={`${(totalMonths / 12).toFixed(1)} years`} accent={totalMonths <= 60 ? "green" : "amber"} />
        <ResultCard label="Projected Freedom" value={freedomDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })} sub="All properties post-payoff" accent="green" />
      </div>
      <div style={{ background: "#111827", borderRadius: 8, height: 24, overflow: "hidden", position: "relative", border: "1px solid #1e2d42", marginBottom: 16 }}>
        <div style={{ width: `${progressPct}%`, height: "100%", background: "#16a34a", borderRadius: 4, transition: "width 0.4s" }} />
        <span style={{ position: "absolute", left: "50%", top: 4, transform: "translateX(-50%)", fontSize: 11, color: "#e8edf5", fontWeight: 700 }}>{progressPct.toFixed(0)}% to freedom</span>
      </div>

      {portfolio.length > 1 && (<>
        <SectionTitle>Portfolio Projection</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2a3a52" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#8a9bb5", fontWeight: 600 }}>Deal</th>
                <th style={{ textAlign: "right", padding: "6px 8px", color: "#8a9bb5", fontWeight: 600 }}>Purchase</th>
                <th style={{ textAlign: "right", padding: "6px 8px", color: "#8a9bb5", fontWeight: 600 }}>Current CF</th>
                <th style={{ textAlign: "right", padding: "6px 8px", color: "#8a9bb5", fontWeight: 600 }}>Post-Payoff CF</th>
                <th style={{ textAlign: "center", padding: "6px 8px", color: "#8a9bb5", fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((d, i) => {
                const a = d.analyzer || {};
                const lPmt = calcMonthlyPayment(a.lenderAmount || 30000, a.lenderRate || 12, a.lenderTermMonths || 60);
                const cf15 = (a.buyerMonthlyPayment || 875) - lPmt - (a.monthlyTaxes || 0) - (a.monthlyInsurance || 0);
                const cf6 = (a.buyerMonthlyPayment || 875) - (a.monthlyTaxes || 0) - (a.monthlyInsurance || 0);
                const created = d.createdAt ? new Date(d.createdAt) : new Date();
                const payoff = new Date(created);
                payoff.setMonth(payoff.getMonth() + (a.lenderTermMonths || 60));
                const paidOff = new Date() > payoff;
                return (
                  <tr key={d.id || i} style={{ borderBottom: "1px solid #1e2d42" }}>
                    <td style={{ padding: "6px 8px", color: "#e8edf5" }}>{d.name || `Deal ${i + 1}`}</td>
                    <td style={{ padding: "6px 8px", color: "#60a5fa", textAlign: "right", fontFamily: "monospace" }}>{fmtCurrency(a.purchasePrice || 30000)}</td>
                    <td style={{ padding: "6px 8px", color: cf15 >= 0 ? "#4ade80" : "#f87171", textAlign: "right", fontFamily: "monospace" }}>{fmtCurrency(paidOff ? cf6 : cf15)}</td>
                    <td style={{ padding: "6px 8px", color: "#4ade80", textAlign: "right", fontFamily: "monospace" }}>{fmtCurrency(cf6)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}><span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 700, background: paidOff ? "#0d3326" : "#332b0d", color: paidOff ? "#4ade80" : "#fbbf24" }}>{paidOff ? "PAID OFF" : "PAYING"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>)}
    </div>
  );
}

function Analyzer({ data, update, assetType }) {
  const config = ASSET_CONFIGS[assetType];
  const { lots, lotRent, utilPayer, parkType, targetCap, pohCount, pohDecade, askingPrice, interestRate, seasonalWorstPct } = data;
  const set = (key) => (val) => update({ ...data, [key]: val });
  let expMultiplier;
  if (assetType === "rv") { const opt = config.expenseOptions.find(o => o.value === parkType) || config.expenseOptions[1]; expMultiplier = opt.ratio; }
  else { const opt = config.expenseOptions.find(o => o.value === utilPayer) || config.expenseOptions[0]; expMultiplier = opt.ratio; }
  const expLabel = `${((1 - expMultiplier) * 100).toFixed(0)}% expense`;
  const annualGross = lots * lotRent * 12;
  const noi = annualGross * expMultiplier;
  const totalPohValue = config.pohEnabled ? pohCount * (config.pohValues[pohDecade] || 0) : 0;
  const offerAt10 = noi / 0.10 + totalPohValue;
  const offerAtTarget = noi / (targetCap / 100) + totalPohValue;
  const impliedCap = askingPrice > 0 ? noi / (askingPrice - totalPohValue) : 0;
  const spread = impliedCap - interestRate / 100;
  const estimatedCoCR = spread > 0 ? spread / 0.25 : 0;
  const annualDS = askingPrice > 0 ? (askingPrice * 0.65) * (interestRate / 100 + 0.04) : 0;
  const monthlyDS = annualDS / 12;
  const worstMonthRev = (annualGross / 12) * ((seasonalWorstPct || 50) / 100);
  const worstMonthNOI = worstMonthRev * expMultiplier;
  const seasonalDSCR = monthlyDS > 0 ? worstMonthNOI / monthlyDS : 0;

  return (
    <div>
      <SectionTitle>Deal Inputs</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Input label={`Occupied ${config.lotLabel}`} value={lots} onChange={set("lots")} hint="Paying only" />
        <Input label={`Current ${config.rentLabel}`} value={lotRent} onChange={set("lotRent")} prefix="$" suffix="/mo" />
        {assetType === "mhp" ? (
          <Select label="Who Pays Utilities?" value={utilPayer} onChange={set("utilPayer")} options={config.expenseOptions} hint={expLabel} />
        ) : (
          <Select label="Park Type" value={parkType} onChange={set("parkType")} options={config.expenseOptions} hint={expLabel} />
        )}
        <Input label="Target Cap Rate" value={targetCap} onChange={set("targetCap")} suffix="%" hint={assetType === "rv" ? "C-class + 3pts for RV" : "10% with upside"} />
      </div>
      {config.pohEnabled && (<><SectionTitle>Park-Owned Homes</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Input label="# Park-Owned Homes" value={pohCount} onChange={set("pohCount")} hint="Goal: as few as possible" />
          <Select label="Average Decade" value={pohDecade} onChange={set("pohDecade")} options={[{ value: "70s", label: "1970s ($3K)" }, { value: "80s", label: "1980s ($5K)" }, { value: "90s", label: "1990s ($10K)" }, { value: "2000s", label: "2000s ($15K)" }]} />
        </div></>)}
      <SectionTitle>Valuation</SectionTitle>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <ResultCard label="Offer @ 10 Cap" value={fmtCurrency(offerAt10)} sub={`NOI: ${fmtCurrency(noi)}/yr`} accent="green" />
        <ResultCard label={`Offer @ ${targetCap} Cap`} value={fmtCurrency(offerAtTarget)} sub={config.pohEnabled ? `Land + Homes` : `${lots} sites`} accent="green" />
      </div>
      <SectionTitle>Compare to Asking</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Input label="Asking Price" value={askingPrice} onChange={set("askingPrice")} prefix="$" />
        <Input label="Interest Rate" value={interestRate} onChange={set("interestRate")} suffix="%" />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <ResultCard label="Implied Cap" value={(impliedCap * 100).toFixed(1) + "%"} sub={impliedCap >= 0.10 ? "Meets 10-cap" : "Below target"} accent={impliedCap >= 0.10 ? "green" : impliedCap >= 0.08 ? "amber" : "red"} />
        <ResultCard label="Spread" value={(spread * 100).toFixed(1) + " pts"} sub={spread >= 0.03 ? ">=3pt target" : "Below 3pt"} accent={spread >= 0.03 ? "green" : spread >= 0.02 ? "amber" : "red"} />
        <ResultCard label="Est. CoC" value={fmtPct(estimatedCoCR)} accent={estimatedCoCR >= 0.20 ? "green" : estimatedCoCR >= 0.15 ? "amber" : "red"} />
      </div>
      {assetType === "rv" && (<><SectionTitle>Seasonal Stress Test</SectionTitle>
        <Input label="Worst Month Revenue (% of avg)" value={seasonalWorstPct} onChange={set("seasonalWorstPct")} suffix="%" hint="Seasonal: 40-50%. Year-round: 70-80%." />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <ResultCard label="Worst Month NOI" value={fmtCurrency(worstMonthNOI)} accent={worstMonthNOI > monthlyDS ? "green" : "red"} />
          <ResultCard label="Monthly Debt Svc" value={fmtCurrency(monthlyDS)} sub="65% LTV est." />
          <ResultCard label="Seasonal DSCR" value={seasonalDSCR.toFixed(2) + "x"} sub={seasonalDSCR >= 1.25 ? "Covers off-season" : seasonalDSCR >= 1.0 ? "Tight" : "Negative CF"} accent={seasonalDSCR >= 1.25 ? "green" : seasonalDSCR >= 1.0 ? "amber" : "red"} />
        </div>
        <div style={{ marginTop: 12 }}><ResultCard label="Reserves Needed" value={fmtCurrency(lots * config.reservePerSpace)} sub={`${lots} sites x $${config.reservePerSpace}`} /></div>
      </>)}
      <div style={{ marginTop: 20, padding: "12px 14px", background: "#111827", borderRadius: 8, border: "1px solid #1e2d42" }}>
        <div style={{ fontSize: 11, color: "#5a7a9e", fontWeight: 600, marginBottom: 6 }}>FORMULA</div>
        <div style={{ fontSize: 12, color: "#8a9bb5", fontFamily: "monospace", lineHeight: 1.8 }}>
          {lots} {config.lotLabel.toLowerCase()} x ${lotRent}/mo x {expMultiplier.toFixed(2)} x 12 = <span style={{ color: "#60a5fa" }}>{fmtCurrency(noi)}</span> NOI<br />
          {fmtCurrency(noi)} / {(targetCap / 100).toFixed(2)} = <span style={{ color: "#60a5fa" }}>{fmtCurrency(noi / (targetCap / 100))}</span><br />
          <span style={{ color: "#4ade80", fontWeight: 700 }}>Offer: {fmtCurrency(offerAtTarget)}</span>
        </div>
        {assetType === "rv" && <div style={{ fontSize: 11, color: "#5a7a9e", marginTop: 8, borderTop: "1px solid #1e2d42", paddingTop: 8 }}>Cap rate: Apartment Loan Store C-class + {config.capRateSpread}pts. Rural +0.5-1pt.</div>}
      </div>
    </div>
  );
}

function Scorecard({ data, update, assetType }) {
  const criteria = assetType === "slowflip" ? SF_CRITERIA : assetType === "rv" ? RV_CRITERIA : MHP_CRITERIA;
  const scores = data;
  const toggle = (id) => { const val = scores[id]; if (val === undefined) update({ ...scores, [id]: true }); else if (val === true) update({ ...scores, [id]: false }); else { const next = { ...scores }; delete next[id]; update(next); } };
  const total = criteria.length;
  const hardFail = criteria.filter(c => c.hard && scores[c.id] === false).length;
  const greenCount = Object.values(scores).filter(v => v === true).length;
  const redCount = Object.values(scores).filter(v => v === false).length;
  let verdict = "Incomplete", vColor = "#5a7a9e";
  if (greenCount + redCount === total) {
    if (hardFail > 0) { verdict = "HARD PASS"; vColor = "#f87171"; }
    else if (redCount === 0) { verdict = "GREEN LIGHT"; vColor = "#4ade80"; }
    else if (redCount <= 2) { verdict = "YELLOW"; vColor = "#fbbf24"; }
    else { verdict = "RED"; vColor = "#f87171"; }
  }
  return (
    <div>
      <SectionTitle>{assetType === "slowflip" ? "Slow Flip" : assetType === "rv" ? "RV Park" : "MHP"} Criteria ({total}-Point)</SectionTitle>
      <div style={{ fontSize: 11, color: "#5a7a9e", marginBottom: 16 }}>Click: unchecked → pass → fail. 1-5 are mandatory.</div>
      {criteria.map(c => {
        const val = scores[c.id];
        const bg = val === true ? "#0d2e1f" : val === false ? "#2e0d0d" : "#151e2d";
        const border = val === true ? "#1a5c3a" : val === false ? "#5c1a1a" : "#222f42";
        const icon = val === true ? "\u2705" : val === false ? "\u274c" : "\u2b1c";
        return (
          <div key={c.id} onClick={() => toggle(c.id)} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 6, cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#e8edf5" }}>{c.id}. {c.name}</span>
                {c.hard && <span style={{ fontSize: 9, background: "#2a1a1a", color: "#f87171", padding: "2px 6px", borderRadius: 3, fontWeight: 700 }}>MANDATORY</span>}
              </div>
              <div style={{ fontSize: 11, color: "#6b7f99", marginTop: 3, lineHeight: 1.4 }}>{c.desc}</div>
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: 20, padding: "16px", background: "#111827", borderRadius: 10, border: "1px solid #1e2d42", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#5a7a9e", fontWeight: 600, marginBottom: 6 }}>VERDICT</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: vColor }}>{verdict}</div>
        <div style={{ fontSize: 12, color: "#5a7a9e", marginTop: 6 }}>{greenCount} pass / {redCount} fail / {total - greenCount - redCount} unchecked</div>
      </div>
    </div>
  );
}

function ValueAdd({ data, update, assetType }) {
  const config = ASSET_CONFIGS[assetType];
  const { currentLots, currentRent, marketRent, currentOccupancy, targetOccupancy, utilPayer, capRate, utilCostPerSite } = data;
  const set = (key) => (val) => update({ ...data, [key]: val });
  const totalLots = Math.round(currentLots / (currentOccupancy / 100));
  let expMult = assetType === "rv" ? (utilPayer === "park" ? 0.45 : 0.52) : (utilPayer === "tenant" ? 0.7 : 0.6);
  const billbackMult = assetType === "rv" ? 0.52 : 0.7;
  const currentNOI = currentLots * currentRent * expMult * 12;
  const currentValue = currentNOI / (capRate / 100);
  const afterRentNOI = currentLots * marketRent * expMult * 12;
  const afterRentValue = afterRentNOI / (capRate / 100);
  const utilBillback = utilPayer === "park" ? currentLots * (utilCostPerSite || 75) * 12 : 0;
  const afterUtilNOI = utilPayer === "park" ? currentLots * currentRent * billbackMult * 12 : currentNOI;
  const afterUtilValue = afterUtilNOI / (capRate / 100);
  const targetLots = Math.round(totalLots * (targetOccupancy / 100));
  const afterFillNOI = targetLots * currentRent * expMult * 12;
  const afterFillValue = afterFillNOI / (capRate / 100);
  const allNOI = targetLots * marketRent * billbackMult * 12;
  const allValue = allNOI / (capRate / 100);
  const Bar = ({ label, noi, val, maxVal, color }) => {
    const pct = maxVal > 0 ? Math.min((val / maxVal) * 100, 100) : 0;
    return (<div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#c8d5e6" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "monospace" }}>{fmtCurrency(val)}</span>
      </div>
      <div style={{ background: "#111827", borderRadius: 4, height: 20, overflow: "hidden", position: "relative" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.4s" }} />
        <span style={{ position: "absolute", right: 8, top: 2, fontSize: 10, color: "#8a9bb5" }}>NOI: {fmtCurrency(noi)}</span>
      </div>
    </div>);
  };
  return (
    <div>
      <SectionTitle>Current State</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Input label={`Occupied ${config.lotLabel}`} value={currentLots} onChange={set("currentLots")} />
        <Input label={`Current ${config.rentLabel}`} value={currentRent} onChange={set("currentRent")} prefix="$" suffix="/mo" />
        <Input label={`Market ${config.rentLabel}`} value={marketRent} onChange={set("marketRent")} prefix="$" suffix="/mo" hint="Comparable parks" />
        <Input label="Current Occupancy" value={currentOccupancy} onChange={set("currentOccupancy")} suffix="%" />
        <Input label="Target Occupancy" value={targetOccupancy} onChange={set("targetOccupancy")} suffix="%" />
        <Select label="Who Pays Utilities?" value={utilPayer} onChange={set("utilPayer")} options={[{ value: "park", label: "Park pays (bill back)" }, { value: "tenant", label: "Tenants pay" }]} />
        <Input label="Cap Rate" value={capRate} onChange={set("capRate")} suffix="%" />
        {utilPayer === "park" && <Input label="Utility Cost/Site" value={utilCostPerSite} onChange={set("utilCostPerSite")} prefix="$" suffix="/mo" hint={assetType === "rv" ? "RV default: $75" : "MHP default: $50-75"} />}
      </div>
      <SectionTitle>Value-Add @ {capRate} Cap</SectionTitle>
      <div style={{ padding: "16px", background: "#111827", borderRadius: 10, border: "1px solid #1e2d42" }}>
        <Bar label="Current" noi={currentNOI} val={currentValue} maxVal={allValue} color="#3b5998" />
        <Bar label="Raise Rents" noi={afterRentNOI} val={afterRentValue} maxVal={allValue} color="#2563eb" />
        {utilPayer === "park" && <Bar label="Bill Back Utilities" noi={afterUtilNOI} val={afterUtilValue} maxVal={allValue} color="#7c3aed" />}
        <Bar label={`Fill to ${targetOccupancy}%`} noi={afterFillNOI} val={afterFillValue} maxVal={allValue} color="#0891b2" />
        <div style={{ borderTop: "1px solid #1e2d42", paddingTop: 12, marginTop: 8 }}>
          <Bar label="ALL COMBINED" noi={allNOI} val={allValue} maxVal={allValue} color="#4ade80" />
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <ResultCard label="Equity Created" value={fmtCurrency(allValue - currentValue)} sub={`${((allValue / currentValue - 1) * 100).toFixed(0)}% increase`} accent="green" />
        <ResultCard label="NOI Increase" value={fmtCurrency(allNOI - currentNOI)} sub={`${fmtCurrency(currentNOI)} to ${fmtCurrency(allNOI)}`} accent="green" />
        {utilPayer === "park" && <ResultCard label="Bill-Back" value={fmtCurrency(utilBillback)} sub={`${currentLots} x $${utilCostPerSite}/mo x 12`} accent="green" />}
      </div>
      {assetType === "rv" && <div style={{ marginTop: 12, fontSize: 11, color: "#5a7a9e", padding: "10px 12px", background: "#0c1220", borderRadius: 6, border: "1px solid #1a2235" }}>
        <strong style={{ color: "#8a9bb5" }}>Rent increase warning:</strong> Budget 20-30% tenant exodus on long-term increases. Phase over 2-3 years.
      </div>}
      <div style={{ marginTop: 12, fontSize: 11, color: "#5a7a9e" }}>Total {config.lotLabel.toLowerCase()}: {totalLots} | Fill: {targetLots - currentLots} | Rent gap: {fmtCurrency(marketRent - currentRent)}/mo</div>
    </div>
  );
}

function MarketCheck({ data, update, assetType }) {
  const { states: cs, zip, firecrawlKey, marketData } = data;
  const [scraping, setScraping] = useState(false);
  const [err, setErr] = useState("");
  const checks = assetType === "slowflip" ? SF_MARKET_CHECKS : assetType === "rv" ? RV_MARKET_CHECKS : MHP_MARKET_CHECKS;
  const toggle = (id) => { const v = cs[id]; let n; if (v === undefined) n = { ...cs, [id]: true }; else if (v === true) n = { ...cs, [id]: false }; else { n = { ...cs }; delete n[id]; } update({ ...data, states: n }); };
  const total = checks.reduce((s, c) => s + c.items.length, 0);
  const passed = Object.values(cs).filter(v => v === true).length;
  const failed = Object.values(cs).filter(v => v === false).length;
  return (
    <div>
      <SectionTitle>Auto-Populate Market Data</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Input label="Zip Code" value={zip} onChange={(v) => update({ ...data, zip: String(v) })} type="text" placeholder="37064" />
        <Input label="Firecrawl Key" value={firecrawlKey} onChange={(v) => update({ ...data, firecrawlKey: v })} type="text" placeholder="fc-..." />
      </div>
      <button onClick={async () => { if (!zip || zip.length !== 5) { setErr("Valid 5-digit zip"); return; } if (!firecrawlKey) { setErr("API key needed"); return; } setScraping(true); setErr(""); try { const r = await (await import("./scraper.js")).scrapeWithFirecrawl(firecrawlKey, zip); update({ ...data, marketData: r }); } catch(e) { setErr(e.message); } finally { setScraping(false); } }} disabled={scraping}
        style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #2a3a52", cursor: scraping ? "wait" : "pointer", background: scraping ? "#1a2235" : "#1a3a5c", color: scraping ? "#5a7a9e" : "#60a5fa", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
        {scraping ? "Scraping..." : "Auto-Populate from bestplaces.net"}
      </button>
      {err && <div style={{ fontSize: 12, color: "#f87171", marginBottom: 12 }}>{err}</div>}
      {marketData && <div style={{ padding: "12px 14px", background: "#0d1f0d", border: "1px solid #1a4a2a", borderRadius: 8, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 600, marginBottom: 8 }}>MARKET DATA</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 12, color: "#8a9bb5" }}>
          {marketData.cityName && <div>City: <span style={{ color: "#e8edf5" }}>{marketData.cityName}, {marketData.stateName}</span></div>}
          {marketData.msaPopulation && <div>Pop: <span style={{ color: "#e8edf5" }}>{marketData.msaPopulation}</span></div>}
          {marketData.medianHomePrice && <div>Home: <span style={{ color: "#e8edf5" }}>${marketData.medianHomePrice}</span></div>}
          {marketData.rent2BR && <div>2BR: <span style={{ color: "#e8edf5" }}>${marketData.rent2BR}</span></div>}
          {marketData.vacancyRate && <div>Vacancy: <span style={{ color: "#e8edf5" }}>{marketData.vacancyRate}%</span></div>}
          {marketData.unemploymentRate && <div>Unemp: <span style={{ color: "#e8edf5" }}>{marketData.unemploymentRate}%</span></div>}
        </div>
        {marketData.topEmployers && <div style={{ marginTop: 8, fontSize: 11, color: "#6b7f99" }}>Employers: <span style={{ color: "#8a9bb5" }}>{marketData.topEmployers.join(", ")}</span></div>}
      </div>}
      <SectionTitle>{assetType === "slowflip" ? "Slow Flip" : assetType === "rv" ? "RV" : "MHP"} Due Diligence</SectionTitle>
      {checks.map(section => (
        <div key={section.cat} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>{section.cat}</div>
          {section.items.map(item => {
            const val = cs[item.id];
            const icon = val === true ? "\u2705" : val === false ? "\u274c" : "\u2b1c";
            const bg = val === true ? "#0d2e1f" : val === false ? "#2e0d0d" : "#151e2d";
            const border = val === true ? "#1a5c3a" : val === false ? "#5c1a1a" : "#222f42";
            return (<div key={item.id} onClick={() => toggle(item.id)} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: "8px 12px", marginBottom: 4, cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 14, lineHeight: 1.2 }}>{icon}</span>
              <div><div style={{ fontSize: 12, fontWeight: 600, color: "#c8d5e6" }}>{item.label}</div><div style={{ fontSize: 10, color: "#5a7a9e", marginTop: 2 }}>{item.source}</div></div>
            </div>);
          })}
        </div>
      ))}
      <div style={{ padding: "12px 16px", background: "#111827", borderRadius: 10, border: "1px solid #1e2d42", textAlign: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>{passed}</span><span style={{ fontSize: 12, color: "#5a7a9e" }}> pass </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#f87171" }}>{failed}</span><span style={{ fontSize: 12, color: "#5a7a9e" }}> fail </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#8a9bb5" }}>{total - passed - failed}</span><span style={{ fontSize: 12, color: "#5a7a9e" }}> / {total}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [deals, setDeals] = useState(loadDeals);
  const [activeDealIndex, setActiveDealIndex] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const deal = deals[activeDealIndex] || deals[0];
  const assetType = deal.assetType || "mhp";
  const config = ASSET_CONFIGS[assetType];
  useEffect(() => { saveDeals(deals); }, [deals]);
  const updateDeal = useCallback((path, value) => {
    setDeals(prev => { const next = [...prev]; const d = { ...next[activeDealIndex] };
      if (path === "name") d.name = value;
      else if (path === "assetType") { d.assetType = value; d.scorecard = {}; d.marketCheck = { ...d.marketCheck, states: {} }; }
      else if (path === "analyzer") d.analyzer = value;
      else if (path === "scorecard") d.scorecard = value;
      else if (path === "valueAdd") d.valueAdd = value;
      else if (path === "marketCheck") d.marketCheck = value;
      next[activeDealIndex] = d; return next;
    });
  }, [activeDealIndex]);
  const addDeal = () => { setDeals(prev => [...prev, defaultDeal()]); setActiveDealIndex(deals.length); setActiveTab(0); };
  const deleteDeal = () => { if (deals.length <= 1) return; if (!confirm("Delete this deal?")) return; setDeals(prev => prev.filter((_, i) => i !== activeDealIndex)); setActiveDealIndex(prev => Math.max(0, prev - 1)); };
  const importDeals = () => { const input = document.createElement("input"); input.type = "file"; input.accept = ".json"; input.onchange = async (e) => { const file = e.target.files[0]; if (!file) return; try { const text = await file.text(); const imported = JSON.parse(text); if (!Array.isArray(imported)) throw new Error("Expected array"); setDeals(prev => [...prev, ...imported]); } catch (err) { alert("Invalid: " + err.message); } }; input.click(); };
  const accent = assetType === "slowflip" ? "#16a34a" : assetType === "rv" ? "#8b5cf6" : "#3b82f6";
  return (
    <div style={{ minHeight: "100vh", background: "#0c1220", color: "#e8edf5", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>Deal Analyzer</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e8edf5", margin: 0, lineHeight: 1.2 }}>{config.label}<br />Investment Calculator</h1>
          <div style={{ fontSize: 11, color: "#4a5f7a", marginTop: 8 }}>Evaluate deals against proven criteria</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <select value={activeDealIndex} onChange={(e) => { setActiveDealIndex(Number(e.target.value)); setActiveTab(0); }}
            style={{ flex: 1, background: "#1a2235", border: "1px solid #2a3a52", borderRadius: 6, color: "#e8edf5", padding: "8px 10px", fontSize: 13, outline: "none", cursor: "pointer" }}>
            {deals.map((d, i) => <option key={d.id} value={i}>{(d.assetType === "slowflip" ? "[SF] " : d.assetType === "rv" ? "[RV] " : "[MHP] ") + (d.name || `Untitled ${i + 1}`)}</option>)}
          </select>
          <button onClick={addDeal} style={{ background: "#1a6b4a", border: "none", borderRadius: 6, color: "#4ade80", padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ New</button>
          <button onClick={importDeals} style={{ background: "#1a2d5c", border: "none", borderRadius: 6, color: "#60a5fa", padding: "8px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Import</button>
          {deals.length > 1 && <button onClick={deleteDeal} style={{ background: "#3d1414", border: "none", borderRadius: 6, color: "#f87171", padding: "8px 10px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{"\u2715"}</button>}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input type="text" value={deal.name} onChange={(e) => updateDeal("name", e.target.value)} placeholder={`Deal Name`}
            style={{ flex: 1, background: "#111827", border: "1px solid #1e2d42", borderRadius: 8, color: "#e8edf5", padding: "10px 14px", fontSize: 15, fontWeight: 600, outline: "none", boxSizing: "border-box" }} />
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #2a3a52" }}>
            <button onClick={() => updateDeal("assetType", "mhp")} style={{ padding: "8px 14px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: assetType === "mhp" ? "#1a3a5c" : "#111827", color: assetType === "mhp" ? "#60a5fa" : "#4a5f7a" }}>MHP</button>
            <button onClick={() => updateDeal("assetType", "rv")} style={{ padding: "8px 14px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: assetType === "rv" ? "#2d1a5c" : "#111827", color: assetType === "rv" ? "#a78bfa" : "#4a5f7a" }}>RV Park</button>
            <button onClick={() => updateDeal("assetType", "slowflip")} style={{ padding: "8px 14px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: assetType === "slowflip" ? "#0d3326" : "#111827", color: assetType === "slowflip" ? "#4ade80" : "#4a5f7a" }}>Slow Flip</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, background: "#111827", borderRadius: 10, padding: 3, marginBottom: 20 }}>
          {TABS.map((tab, i) => <button key={tab} onClick={() => setActiveTab(i)} style={{ flex: 1, padding: "9px 4px", borderRadius: 8, border: "none", cursor: "pointer", background: activeTab === i ? "#1e2d42" : "transparent", color: activeTab === i ? accent : "#5a7a9e", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>{tab}</button>)}
        </div>
        <div style={{ background: "#111d2e", borderRadius: 12, border: "1px solid #1e2d42", padding: "16px 18px" }}>
          {activeTab === 0 && (assetType === "slowflip"
            ? <SlowFlipAnalyzer data={deal.analyzer} update={(v) => updateDeal("analyzer", v)} />
            : <Analyzer data={deal.analyzer} update={(v) => updateDeal("analyzer", v)} assetType={assetType} />)}
          {activeTab === 1 && <Scorecard data={deal.scorecard} update={(v) => updateDeal("scorecard", v)} assetType={assetType} />}
          {activeTab === 2 && (assetType === "slowflip"
            ? <SlowFlipValueAdd data={deal.valueAdd} update={(v) => updateDeal("valueAdd", v)} analyzerData={deal.analyzer} />
            : <ValueAdd data={deal.valueAdd} update={(v) => updateDeal("valueAdd", v)} assetType={assetType} />)}
          {activeTab === 3 && <MarketCheck data={deal.marketCheck} update={(v) => updateDeal("marketCheck", v)} assetType={assetType} />}
        </div>
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 10, color: "#2a3a52" }}>
          Built with AI | {assetType === "slowflip" ? "Scott Jelinek slow flip framework" : assetType === "rv" ? "Dustin Kercher RV framework" : "Justin Donald MHP framework"}
        </div>
      </div>
    </div>
  );
}

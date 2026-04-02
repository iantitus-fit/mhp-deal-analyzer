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

// ─── Deal State Defaults ────────────────────────────────────
function defaultDeal() {
  return {
    id: crypto.randomUUID(),
    name: "",
    createdAt: new Date().toISOString(),
    analyzer: { lots: 50, lotRent: 200, utilPayer: "tenant", targetCap: 10, pohCount: 5, pohDecade: "90s", askingPrice: 900000, interestRate: 5 },
    scorecard: {},
    valueAdd: { currentLots: 50, currentRent: 175, marketRent: 280, currentOccupancy: 70, targetOccupancy: 90, utilPayer: "park", capRate: 10 },
    marketCheck: { states: {}, zip: "", firecrawlKey: "", marketData: null },
  };
}

function loadDeals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [defaultDeal()];
}

function saveDeals(deals) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
}

// ─── Shared Components ───────────────────────────────────────
function Input({ label, value, onChange, type = "number", prefix, suffix, hint, small, placeholder }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a9bb5", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 0, background: "#1a2235", borderRadius: 6, border: "1px solid #2a3a52", overflow: "hidden" }}>
        {prefix && <span style={{ padding: "8px 0 8px 10px", color: "#5a7a9e", fontSize: 14, fontWeight: 600 }}>{prefix}</span>}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none", color: "#e8edf5",
            padding: prefix ? "8px 10px 8px 4px" : "8px 10px", fontSize: small ? 13 : 15, fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
            width: small ? 70 : "100%", minWidth: 0
          }}
        />
        {suffix && <span style={{ padding: "8px 10px 8px 0", color: "#5a7a9e", fontSize: 12, fontWeight: 500 }}>{suffix}</span>}
      </div>
      {hint && <div style={{ fontSize: 10, color: "#5a7a9e", marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

function Select({ label, value, onChange, options, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a9bb5", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", background: "#1a2235", border: "1px solid #2a3a52", borderRadius: 6,
          color: "#e8edf5", padding: "8px 10px", fontSize: 14, outline: "none", cursor: "pointer"
        }}
      >
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

// ─── ANALYZER TAB ────────────────────────────────────────────
function Analyzer({ data, update }) {
  const { lots, lotRent, utilPayer, targetCap, pohCount, pohDecade, askingPrice, interestRate } = data;
  const set = (key) => (val) => update({ ...data, [key]: val });

  const expMultiplier = utilPayer === "tenant" ? 0.7 : 0.6;
  const expRatio = utilPayer === "tenant" ? 30 : 40;
  const annualGrossLotIncome = lots * lotRent * 12;
  const noi = annualGrossLotIncome * expMultiplier;

  const pohValues = { "70s": 3000, "80s": 5000, "90s": 10000, "2000s": 15000 };
  const totalPohValue = pohCount * (pohValues[pohDecade] || 0);

  const offerAt10 = noi / 0.10 + totalPohValue;
  const offerAtTarget = noi / (targetCap / 100) + totalPohValue;

  const impliedCap = askingPrice > 0 ? noi / (askingPrice - totalPohValue) : 0;
  const spread = impliedCap - interestRate / 100;
  const estimatedCoCR = spread > 0 ? spread / 0.25 : 0;

  return (
    <div>
      <SectionTitle>Deal Inputs</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Input label="Occupied Lots" value={lots} onChange={set("lots")} hint="Paying tenants only" />
        <Input label="Current Lot Rent" value={lotRent} onChange={set("lotRent")} prefix="$" suffix="/mo" />
        <Select label="Who Pays Utilities?" value={utilPayer} onChange={set("utilPayer")}
          options={[{ value: "tenant", label: "Tenants pay direct (30% expense)" }, { value: "park", label: "Park pays / included (40% expense)" }]}
          hint={`Using ${expRatio}% expense ratio (\u00d7${expMultiplier === 0.7 ? "7" : "6"})`} />
        <Input label="Target Cap Rate" value={targetCap} onChange={set("targetCap")} suffix="%" hint="Justin recommends 10% with upside" />
      </div>

      <SectionTitle>Park-Owned Homes</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Input label="# of Park-Owned Homes" value={pohCount} onChange={set("pohCount")} hint="Goal: as few as possible" />
        <Select label="Average Decade" value={pohDecade} onChange={set("pohDecade")}
          options={[{ value: "70s", label: "1970s ($3K each)" }, { value: "80s", label: "1980s ($5K each)" }, { value: "90s", label: "1990s ($10K each)" }, { value: "2000s", label: "2000s ($15K each)" }]} />
      </div>

      <SectionTitle>Your Offer Price</SectionTitle>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <ResultCard label="Offer @ 10 Cap" value={fmtCurrency(offerAt10)} sub={`Land: ${fmtCurrency(offerAt10 - totalPohValue)} + Homes: ${fmtCurrency(totalPohValue)}`} accent="green" />
        <ResultCard label={`Offer @ ${targetCap} Cap`} value={fmtCurrency(offerAtTarget)} sub={`NOI: ${fmtCurrency(noi)} / year`} accent="green" />
      </div>

      <SectionTitle>Compare to Asking Price</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Input label="Seller's Asking Price" value={askingPrice} onChange={set("askingPrice")} prefix="$" />
        <Input label="Interest Rate Available" value={interestRate} onChange={set("interestRate")} suffix="%" hint="For spread calculation" />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <ResultCard label="Implied Cap Rate" value={(impliedCap * 100).toFixed(1) + "%"} sub={impliedCap >= 0.10 ? "Meets 10-cap target" : "Below 10-cap \u2014 negotiate or value-add"} accent={impliedCap >= 0.10 ? "green" : impliedCap >= 0.08 ? "amber" : "red"} />
        <ResultCard label="Spread" value={(spread * 100).toFixed(1) + " pts"} sub={spread >= 0.03 ? "\u22653pt spread \u2014 target 20%+ CoC" : "Below 3pt spread target"} accent={spread >= 0.03 ? "green" : spread >= 0.02 ? "amber" : "red"} />
        <ResultCard label="Est. Cash-on-Cash" value={fmtPct(estimatedCoCR)} sub="Based on spread (rough est.)" accent={estimatedCoCR >= 0.20 ? "green" : estimatedCoCR >= 0.15 ? "amber" : "red"} />
      </div>

      <div style={{ marginTop: 20, padding: "12px 14px", background: "#111827", borderRadius: 8, border: "1px solid #1e2d42" }}>
        <div style={{ fontSize: 11, color: "#5a7a9e", fontWeight: 600, marginBottom: 6 }}>FORMULA</div>
        <div style={{ fontSize: 12, color: "#8a9bb5", fontFamily: "monospace", lineHeight: 1.8 }}>
          {lots} lots \u00d7 ${lotRent}/mo \u00d7 {expMultiplier === 0.7 ? "0.70" : "0.60"} \u00d7 12 = <span style={{ color: "#60a5fa" }}>{fmtCurrency(noi)}</span> NOI<br />
          {fmtCurrency(noi)} \u00f7 {(targetCap / 100).toFixed(2)} = <span style={{ color: "#60a5fa" }}>{fmtCurrency(noi / (targetCap / 100))}</span> land value<br />
          + {pohCount} homes \u00d7 {fmtCurrency(pohValues[pohDecade])} = <span style={{ color: "#60a5fa" }}>{fmtCurrency(totalPohValue)}</span><br />
          <span style={{ color: "#4ade80", fontWeight: 700 }}>Total offer: {fmtCurrency(offerAtTarget)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── SCORECARD TAB ───────────────────────────────────────────
function Scorecard({ data, update }) {
  const criteria = [
    { id: 1, name: "Legal Park", desc: "Confirmed legal or legal non-conforming. Call city building inspector.", hard: true },
    { id: 2, name: "Location", desc: "Midwest/Great Plains preferred. Avoid Deep South (except ATL, Birmingham). Avoid pro-tenant states (NY, NJ, CA). No rent control.", hard: true },
    { id: 3, name: "Size (50+ lots)", desc: "50-100+ units ideal. Same work for 25 as 50. Better exit options with more lots.", hard: true },
    { id: 4, name: "City Utilities", desc: "City water + city sewer. No well water, lagoons, treatment plants, or master meter electric/gas.", hard: true },
    { id: 5, name: "MSA 100K+ Population", desc: "Metro statistical area must be 100K+. Economic growth, diversified employers, not a one-trick pony town.", hard: true },
    { id: 6, name: "Cap Rate \u2265 10 (or path to 10)", desc: "Buy at 10 cap or buy at 8-9 with clear plan to reach 10 quickly via rent raises, expense cuts, vacancy fills.", hard: false },
    { id: 7, name: "Cash-on-Cash \u2265 20%", desc: "Need 3-point spread between interest rate and cap rate. More spread = more return.", hard: false },
    { id: 8, name: "Occupancy \u2265 70%", desc: "Banks require 70%+ for stabilized lending. 80%+ preferred. If low, must be poor management not weak market.", hard: false },
    { id: 9, name: "Few Park-Owned Homes", desc: "Fewer = less expense and oversight. Sell POH to residents on contract. Lot-rent-only is the goal.", hard: false },
    { id: 10, name: "Purchase Price in Range", desc: "Fits your capital or can find money for a great deal. Don\u2019t rule out bigger deals if fundamentals are strong.", hard: false },
  ];

  const scores = data;
  const toggle = (id) => {
    const val = scores[id];
    if (val === undefined) update({ ...scores, [id]: true });
    else if (val === true) update({ ...scores, [id]: false });
    else {
      const next = { ...scores };
      delete next[id];
      update(next);
    }
  };

  const hardPass = criteria.filter((c) => c.hard && scores[c.id] === false).length;
  const greenCount = Object.values(scores).filter((v) => v === true).length;
  const redCount = Object.values(scores).filter((v) => v === false).length;

  let verdict = "Incomplete";
  let verdictColor = "#5a7a9e";
  if (greenCount + redCount === 10) {
    if (hardPass > 0) { verdict = "HARD PASS \u2014 Failed mandatory criteria"; verdictColor = "#f87171"; }
    else if (redCount === 0) { verdict = "GREEN LIGHT \u2014 Buy this park"; verdictColor = "#4ade80"; }
    else if (redCount <= 2) { verdict = "YELLOW \u2014 Negotiate or value-add needed"; verdictColor = "#fbbf24"; }
    else { verdict = "RED \u2014 Too many issues"; verdictColor = "#f87171"; }
  }

  return (
    <div>
      <SectionTitle>10-Point Investment Criteria</SectionTitle>
      <div style={{ fontSize: 11, color: "#5a7a9e", marginBottom: 16 }}>Click to cycle: \u2b1c unchecked \u2192 \u2705 pass \u2192 \u274c fail. Criteria 1-5 are hard requirements (can\u2019t be changed).</div>

      {criteria.map((c) => {
        const val = scores[c.id];
        const bg = val === true ? "#0d2e1f" : val === false ? "#2e0d0d" : "#151e2d";
        const border = val === true ? "#1a5c3a" : val === false ? "#5c1a1a" : "#222f42";
        const icon = val === true ? "\u2705" : val === false ? "\u274c" : "\u2b1c";
        return (
          <div key={c.id} onClick={() => toggle(c.id)}
            style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 6, cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start", transition: "all 0.15s" }}>
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
        <div style={{ fontSize: 18, fontWeight: 800, color: verdictColor }}>{verdict}</div>
        <div style={{ fontSize: 12, color: "#5a7a9e", marginTop: 6 }}>{greenCount} pass \u00b7 {redCount} fail \u00b7 {10 - greenCount - redCount} unchecked</div>
      </div>
    </div>
  );
}

// ─── VALUE-ADD TAB ───────────────────────────────────────────
function ValueAdd({ data, update }) {
  const { currentLots, currentRent, marketRent, currentOccupancy, targetOccupancy, utilPayer, capRate } = data;
  const set = (key) => (val) => update({ ...data, [key]: val });

  const totalLots = Math.round(currentLots / (currentOccupancy / 100));
  const expMult = utilPayer === "tenant" ? 0.7 : 0.6;
  const billbackMult = 0.7;

  const currentNOI = currentLots * currentRent * expMult * 12;
  const currentValue = currentNOI / (capRate / 100);

  const afterRentNOI = currentLots * marketRent * expMult * 12;
  const afterRentValue = afterRentNOI / (capRate / 100);

  const afterUtilNOI = utilPayer === "park" ? currentLots * currentRent * billbackMult * 12 : currentNOI;
  const afterUtilValue = afterUtilNOI / (capRate / 100);

  const targetLots = Math.round(totalLots * (targetOccupancy / 100));
  const afterFillNOI = targetLots * currentRent * expMult * 12;
  const afterFillValue = afterFillNOI / (capRate / 100);

  const allThreeNOI = targetLots * marketRent * billbackMult * 12;
  const allThreeValue = allThreeNOI / (capRate / 100);

  const Bar = ({ label, noi, val, maxVal, color }) => {
    const pct = maxVal > 0 ? Math.min((val / maxVal) * 100, 100) : 0;
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#c8d5e6" }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "monospace" }}>{fmtCurrency(val)}</span>
        </div>
        <div style={{ background: "#111827", borderRadius: 4, height: 20, overflow: "hidden", position: "relative" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.4s ease" }} />
          <span style={{ position: "absolute", right: 8, top: 2, fontSize: 10, color: "#8a9bb5" }}>NOI: {fmtCurrency(noi)}</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <SectionTitle>Current State</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Input label="Occupied Lots" value={currentLots} onChange={set("currentLots")} />
        <Input label="Current Lot Rent" value={currentRent} onChange={set("currentRent")} prefix="$" suffix="/mo" />
        <Input label="Market Lot Rent" value={marketRent} onChange={set("marketRent")} prefix="$" suffix="/mo" hint="What comparable parks charge" />
        <Input label="Current Occupancy" value={currentOccupancy} onChange={set("currentOccupancy")} suffix="%" />
        <Input label="Target Occupancy" value={targetOccupancy} onChange={set("targetOccupancy")} suffix="%" />
        <Select label="Who Pays Utilities Now?" value={utilPayer} onChange={set("utilPayer")}
          options={[{ value: "park", label: "Park pays (can bill back)" }, { value: "tenant", label: "Tenants pay direct" }]} />
        <Input label="Cap Rate for Valuation" value={capRate} onChange={set("capRate")} suffix="%" />
      </div>

      <SectionTitle>Value-Add Scenarios @ {capRate} Cap</SectionTitle>
      <div style={{ padding: "16px", background: "#111827", borderRadius: 10, border: "1px solid #1e2d42" }}>
        <Bar label="Current" noi={currentNOI} val={currentValue} maxVal={allThreeValue} color="#3b5998" />
        <Bar label="Raise Rents to Market" noi={afterRentNOI} val={afterRentValue} maxVal={allThreeValue} color="#2563eb" />
        {utilPayer === "park" && <Bar label="Bill Back Utilities" noi={afterUtilNOI} val={afterUtilValue} maxVal={allThreeValue} color="#7c3aed" />}
        <Bar label={`Fill to ${targetOccupancy}% Occupancy`} noi={afterFillNOI} val={afterFillValue} maxVal={allThreeValue} color="#0891b2" />
        <div style={{ borderTop: "1px solid #1e2d42", paddingTop: 12, marginTop: 8 }}>
          <Bar label="ALL THREE COMBINED" noi={allThreeNOI} val={allThreeValue} maxVal={allThreeValue} color="#4ade80" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <ResultCard label="Equity Created" value={fmtCurrency(allThreeValue - currentValue)} sub={`${((allThreeValue / currentValue - 1) * 100).toFixed(0)}% increase in value`} accent="green" />
        <ResultCard label="NOI Increase" value={fmtCurrency(allThreeNOI - currentNOI)} sub={`${fmtCurrency(currentNOI)} \u2192 ${fmtCurrency(allThreeNOI)}`} accent="green" />
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: "#5a7a9e", lineHeight: 1.6 }}>
        Total lots in park (est.): {totalLots} \u00b7 Lots to fill: {targetLots - currentLots} \u00b7 Rent gap: {fmtCurrency(marketRent - currentRent)}/lot/mo
      </div>
    </div>
  );
}

// ─── FIRECRAWL SCRAPER ──────────────────────────────────────
async function scrapeWithFirecrawl(apiKey, zip) {
  const baseUrl = "https://api.firecrawl.dev/v1";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };

  const scrape = async (url) => {
    const res = await fetch(`${baseUrl}/scrape`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, formats: ["markdown"] }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Firecrawl error ${res.status}`);
    }
    const json = await res.json();
    return json.data?.markdown || "";
  };

  // Scrape bestplaces.net for the zip
  const bestplacesUrl = `https://www.bestplaces.net/zip-code/${zip}`;
  const bpMarkdown = await scrape(bestplacesUrl);

  // Parse market data from bestplaces markdown
  const marketData = {};

  // MSA Population - look for metro/MSA population figures
  const popMatch = bpMarkdown.match(/(?:metro|msa|metropolitan).*?(?:population|pop)[^\d]*?([\d,]+)/i)
    || bpMarkdown.match(/(?:population|pop).*?(?:metro|msa|metropolitan)[^\d]*?([\d,]+)/i)
    || bpMarkdown.match(/(?:population)[^\d]*?([\d,]+)/i);
  if (popMatch) marketData.msaPopulation = popMatch[1];

  // Median Home Price
  const homeMatch = bpMarkdown.match(/median\s+home\s+(?:price|value|cost)[^\$]*?\$([\d,]+)/i)
    || bpMarkdown.match(/\$([\d,]+).*?median.*?home/i);
  if (homeMatch) marketData.medianHomePrice = homeMatch[1];

  // 2BR rent
  const rent2Match = bpMarkdown.match(/2[\s-]*(?:br|bed|bedroom)[^\$]*?\$([\d,]+)/i)
    || bpMarkdown.match(/\$([\d,]+).*?2[\s-]*(?:br|bed|bedroom)/i);
  if (rent2Match) marketData.rent2BR = rent2Match[1];

  // 3BR rent
  const rent3Match = bpMarkdown.match(/3[\s-]*(?:br|bed|bedroom)[^\$]*?\$([\d,]+)/i)
    || bpMarkdown.match(/\$([\d,]+).*?3[\s-]*(?:br|bed|bedroom)/i);
  if (rent3Match) marketData.rent3BR = rent3Match[1];

  // Housing vacancy rate
  const vacMatch = bpMarkdown.match(/(?:housing\s+)?vacanc[yi][^\d]*?([\d.]+)\s*%/i);
  if (vacMatch) marketData.vacancyRate = vacMatch[1];

  // Unemployment rate
  const unempMatch = bpMarkdown.match(/unemploy[^\d]*?([\d.]+)\s*%/i);
  if (unempMatch) marketData.unemploymentRate = unempMatch[1];

  // Try to find city name from the bestplaces content
  const cityMatch = bpMarkdown.match(/(?:^|\n)#?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),?\s*([A-Z]{2})/m);
  let cityName = "";
  let stateName = "";
  if (cityMatch) {
    cityName = cityMatch[1];
    stateName = cityMatch[2];
  }

  // Scrape Wikipedia for top employers
  if (cityName) {
    try {
      const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(cityName.replace(/\s/g, "_"))},_${stateName}`;
      const wikiMarkdown = await scrape(wikiUrl);

      // Look for employer-related sections
      const employers = [];
      const employerSection = wikiMarkdown.match(/(?:(?:top|major|largest)\s+employers|economy)[\s\S]*?(?:\n#{1,3}\s|\n\n\n|$)/i);
      if (employerSection) {
        const lines = employerSection[0].split("\n");
        for (const line of lines) {
          // Match table rows or list items that look like employer names
          const match = line.match(/(?:\|\s*|[-*]\s+|^\d+[.)]\s*)([A-Z][A-Za-z\s&'.,-]+?)(?:\s*\||\s*[-\u2013]\s*[\d,]+|\s*$)/);
          if (match && match[1].trim().length > 2 && employers.length < 10) {
            const name = match[1].trim();
            if (!/^(rank|employer|company|name|#|number)/i.test(name)) {
              employers.push(name);
            }
          }
        }
      }
      if (employers.length > 0) marketData.topEmployers = employers;
      marketData.cityName = cityName;
      marketData.stateName = stateName;
    } catch {
      // Wikipedia scrape failed, continue without employers
    }
  }

  return marketData;
}

// ─── MARKET CHECK TAB ────────────────────────────────────────
function MarketCheck({ data, update }) {
  const { states: checkStates, zip, firecrawlKey, marketData } = data;
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");

  const checks = [
    { cat: "Population & Economy", items: [
      { label: "MSA Population \u2265 100,000", source: "bestplaces.net \u2192 Metro", id: "pop" },
      { label: "Unemployment below US avg", source: "bestplaces.net \u2192 Economy", id: "unemp" },
      { label: "Diversified top 10 employers", source: "Wikipedia \u2192 City \u2192 Economy", id: "emp" },
      { label: "No single-employer dependency", source: "Check if #1 employer is 4x bigger than #2", id: "dep" },
      { label: "Walmart within reasonable distance", source: "Google Maps", id: "walmart" },
    ]},
    { cat: "Housing Market", items: [
      { label: "Median home price \u2265 $100K (ideal $200K+)", source: "bestplaces.net \u2192 Housing", id: "homeprice" },
      { label: "2BR apartment rent \u2265 $600", source: "bestplaces.net \u2192 Housing", id: "apt2" },
      { label: "3BR apartment rent \u2265 $800", source: "bestplaces.net \u2192 Housing", id: "apt3" },
      { label: "Housing vacancy < 12.5% (ideal < 10%)", source: "bestplaces.net \u2192 Housing", id: "vacancy" },
    ]},
    { cat: "Park Specifics", items: [
      { label: "City water (not well)", source: "Seller / due diligence", id: "water" },
      { label: "City sewer (not lagoon/treatment plant)", source: "Seller / due diligence", id: "sewer" },
      { label: "No master meter electric", source: "Check meter \u2014 company name = good", id: "elec" },
      { label: "No master meter gas", source: "Seller / due diligence", id: "gas" },
      { label: "Density \u2264 15 units/acre (ideal 7)", source: "Plat map / aerial", id: "density" },
      { label: "Lots fit 14\u00d746 minimum (ideal 14\u00d780)", source: "Plat map / seller", id: "lotsize" },
      { label: "Not in pro-tenant / rent control state", source: "Avoid NY, NJ, CA", id: "state" },
      { label: "Not land-value-driven pricing", source: "Avoid FL, CA coastal \u2014 buy on income approach", id: "landval" },
    ]},
    { cat: "Deal Signals", items: [
      { label: "Lot rent $125-$200 (under market)", source: "Compare to bestplaces / comps", id: "lotrent" },
      { label: "Total home+lot \u2264 $500/mo target", source: "Stays in affordability sweet spot", id: "afford" },
      { label: "Mix of old and new homes (roof check)", source: "Flat/metal = 70s-80s, pitched = 90s+", id: "mix" },
      { label: "Seller finance possible", source: "Ask 3 times: beginning, middle, end", id: "sf" },
    ]},
  ];

  const toggle = (id) => {
    const val = checkStates[id];
    let next;
    if (val === undefined) next = { ...checkStates, [id]: true };
    else if (val === true) next = { ...checkStates, [id]: false };
    else {
      next = { ...checkStates };
      delete next[id];
    }
    update({ ...data, states: next });
  };

  const total = checks.reduce((sum, c) => sum + c.items.length, 0);
  const passed = Object.values(checkStates).filter((v) => v === true).length;
  const failed = Object.values(checkStates).filter((v) => v === false).length;

  const handleAutoPopulate = async () => {
    if (!zip || zip.length !== 5) {
      setScrapeError("Enter a valid 5-digit zip code");
      return;
    }
    if (!firecrawlKey) {
      setScrapeError("Enter your Firecrawl API key");
      return;
    }
    setScraping(true);
    setScrapeError("");
    try {
      const result = await scrapeWithFirecrawl(firecrawlKey, zip);
      update({ ...data, marketData: result });
    } catch (err) {
      setScrapeError(err.message || "Scraping failed");
    } finally {
      setScraping(false);
    }
  };

  return (
    <div>
      {/* Auto-Populate Section */}
      <SectionTitle>Auto-Populate from Web</SectionTitle>
      <div style={{ padding: "14px", background: "#0d1520", borderRadius: 10, border: "1px solid #1e2d42", marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Input label="Zip Code" value={zip} onChange={(v) => update({ ...data, zip: typeof v === "number" ? String(v) : v })} type="text" placeholder="e.g. 73301" />
          <Input label="Firecrawl API Key" value={firecrawlKey} onChange={(v) => update({ ...data, firecrawlKey: v })} type="text" placeholder="fc-..." hint="Get one at firecrawl.dev" />
        </div>
        <button
          onClick={handleAutoPopulate}
          disabled={scraping}
          style={{
            width: "100%", padding: "10px", borderRadius: 8, border: "none", cursor: scraping ? "wait" : "pointer",
            background: scraping ? "#1e2d42" : "#2563eb", color: "#fff", fontSize: 13, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.15s",
            opacity: scraping ? 0.6 : 1,
          }}
        >
          {scraping ? "Scraping..." : "Auto-Populate"}
        </button>
        {scrapeError && <div style={{ color: "#f87171", fontSize: 11, marginTop: 8 }}>{scrapeError}</div>}
        <div style={{ fontSize: 10, color: "#4a5f7a", marginTop: 8 }}>
          Optional \u2014 scrapes bestplaces.net and Wikipedia. All fields can be checked manually without this.
        </div>
      </div>

      {/* Scraped Data Display */}
      {marketData && (
        <div style={{ marginBottom: 18, padding: "14px", background: "#0d1a2a", borderRadius: 10, border: "1px solid #1a3a5c" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Scraped Data {marketData.cityName && `\u2014 ${marketData.cityName}, ${marketData.stateName}`}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "MSA Population", value: marketData.msaPopulation, pass: marketData.msaPopulation && parseInt(marketData.msaPopulation.replace(/,/g, "")) >= 100000 },
              { label: "Median Home Price", value: marketData.medianHomePrice ? `$${marketData.medianHomePrice}` : null, pass: marketData.medianHomePrice && parseInt(marketData.medianHomePrice.replace(/,/g, "")) >= 100000 },
              { label: "2BR Rent", value: marketData.rent2BR ? `$${marketData.rent2BR}` : null, pass: marketData.rent2BR && parseInt(marketData.rent2BR.replace(/,/g, "")) >= 600 },
              { label: "3BR Rent", value: marketData.rent3BR ? `$${marketData.rent3BR}` : null, pass: marketData.rent3BR && parseInt(marketData.rent3BR.replace(/,/g, "")) >= 800 },
              { label: "Housing Vacancy", value: marketData.vacancyRate ? `${marketData.vacancyRate}%` : null, pass: marketData.vacancyRate && parseFloat(marketData.vacancyRate) < 12.5 },
              { label: "Unemployment", value: marketData.unemploymentRate ? `${marketData.unemploymentRate}%` : null, pass: marketData.unemploymentRate && parseFloat(marketData.unemploymentRate) < 4.0 },
            ].map((item) => (
              <div key={item.label} style={{
                padding: "8px 10px", borderRadius: 6,
                background: item.value ? (item.pass ? "#0a1f15" : "#1f0a0a") : "#151e2d",
                border: `1px solid ${item.value ? (item.pass ? "#143d2a" : "#3d1414") : "#222f42"}`,
              }}>
                <div style={{ fontSize: 10, color: "#6b7f99", textTransform: "uppercase" }}>{item.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: item.value ? (item.pass ? "#4ade80" : "#f87171") : "#5a7a9e", fontFamily: "monospace" }}>
                  {item.value || "Not found"}
                </div>
              </div>
            ))}
          </div>

          {marketData.topEmployers && marketData.topEmployers.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: "#6b7f99", textTransform: "uppercase", marginBottom: 6 }}>Top Employers</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {marketData.topEmployers.map((emp, i) => (
                  <span key={i} style={{
                    fontSize: 11, padding: "3px 8px", borderRadius: 4,
                    background: "#1a2235", border: "1px solid #2a3a52", color: "#c8d5e6"
                  }}>
                    {i + 1}. {emp}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <SectionTitle>Market & Park Due Diligence Checklist</SectionTitle>
      <div style={{ fontSize: 11, color: "#5a7a9e", marginBottom: 16 }}>Click to cycle: \u2b1c \u2192 \u2705 \u2192 \u274c. Use bestplaces.net, Wikipedia, and Google Maps to validate.</div>

      {checks.map((cat) => (
        <div key={cat.cat} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{cat.cat}</div>
          {cat.items.map((item) => {
            const val = checkStates[item.id];
            const icon = val === true ? "\u2705" : val === false ? "\u274c" : "\u2b1c";
            return (
              <div key={item.id} onClick={() => toggle(item.id)}
                style={{ display: "flex", gap: 10, padding: "7px 10px", borderRadius: 6, cursor: "pointer", marginBottom: 3,
                  background: val === true ? "#0a1f15" : val === false ? "#1f0a0a" : "transparent",
                  border: `1px solid ${val === true ? "#143d2a" : val === false ? "#3d1414" : "transparent"}` }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#c8d5e6", fontWeight: 500 }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: "#4a5f7a" }}>{item.source}</div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div style={{ padding: "12px 16px", background: "#111827", borderRadius: 10, border: "1px solid #1e2d42", textAlign: "center", marginTop: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>{passed}</span>
        <span style={{ fontSize: 12, color: "#5a7a9e" }}> pass \u00b7 </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#f87171" }}>{failed}</span>
        <span style={{ fontSize: 12, color: "#5a7a9e" }}> fail \u00b7 </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#8a9bb5" }}>{total - passed - failed}</span>
        <span style={{ fontSize: 12, color: "#5a7a9e" }}> unchecked of {total}</span>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────
export default function App() {
  const [deals, setDeals] = useState(loadDeals);
  const [activeDealIndex, setActiveDealIndex] = useState(0);
  const [activeTab, setActiveTab] = useState(0);

  const deal = deals[activeDealIndex] || deals[0];

  // Save to localStorage whenever deals change
  useEffect(() => {
    saveDeals(deals);
  }, [deals]);

  const updateDeal = useCallback((path, value) => {
    setDeals((prev) => {
      const next = [...prev];
      const d = { ...next[activeDealIndex] };
      if (path === "name") d.name = value;
      else if (path === "analyzer") d.analyzer = value;
      else if (path === "scorecard") d.scorecard = value;
      else if (path === "valueAdd") d.valueAdd = value;
      else if (path === "marketCheck") d.marketCheck = value;
      next[activeDealIndex] = d;
      return next;
    });
  }, [activeDealIndex]);

  const addDeal = () => {
    setDeals((prev) => [...prev, defaultDeal()]);
    setActiveDealIndex(deals.length);
    setActiveTab(0);
  };

  const deleteDeal = () => {
    if (deals.length <= 1) return;
    if (!confirm("Delete this deal?")) return;
    setDeals((prev) => prev.filter((_, i) => i !== activeDealIndex));
    setActiveDealIndex((prev) => Math.max(0, prev - 1));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0c1220", color: "#e8edf5", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 40px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>MHP Deal Analyzer</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e8edf5", margin: 0, lineHeight: 1.2 }}>Mobile Home Park<br />Investment Calculator</h1>
          <div style={{ fontSize: 11, color: "#4a5f7a", marginTop: 8 }}>Evaluate deals against proven investment criteria</div>
        </div>

        {/* Deal Selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <select
            value={activeDealIndex}
            onChange={(e) => { setActiveDealIndex(Number(e.target.value)); setActiveTab(0); }}
            style={{
              flex: 1, background: "#1a2235", border: "1px solid #2a3a52", borderRadius: 6,
              color: "#e8edf5", padding: "8px 10px", fontSize: 13, outline: "none", cursor: "pointer"
            }}
          >
            {deals.map((d, i) => (
              <option key={d.id} value={i}>{d.name || `Untitled Deal ${i + 1}`}</option>
            ))}
          </select>
          <button onClick={addDeal} style={{
            background: "#1a6b4a", border: "none", borderRadius: 6, color: "#4ade80",
            padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer"
          }}>+ New</button>
          {deals.length > 1 && (
            <button onClick={deleteDeal} style={{
              background: "#3d1414", border: "none", borderRadius: 6, color: "#f87171",
              padding: "8px 10px", fontSize: 13, fontWeight: 700, cursor: "pointer"
            }}>\u2715</button>
          )}
        </div>

        {/* Deal Name */}
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            value={deal.name}
            onChange={(e) => updateDeal("name", e.target.value)}
            placeholder="Deal Name (e.g. Sunset Acres MHP - Springfield, MO)"
            style={{
              width: "100%", background: "#111827", border: "1px solid #1e2d42", borderRadius: 8,
              color: "#e8edf5", padding: "10px 14px", fontSize: 15, fontWeight: 600, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, background: "#111827", borderRadius: 10, padding: 3, marginBottom: 20 }}>
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              style={{
                flex: 1, padding: "9px 4px", borderRadius: 8, border: "none", cursor: "pointer",
                background: activeTab === i ? "#1e2d42" : "transparent",
                color: activeTab === i ? "#60a5fa" : "#5a7a9e",
                fontSize: 12, fontWeight: 700, transition: "all 0.15s",
                textTransform: "uppercase", letterSpacing: "0.03em"
              }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ background: "#111d2e", borderRadius: 12, border: "1px solid #1e2d42", padding: "16px 18px" }}>
          {activeTab === 0 && <Analyzer data={deal.analyzer} update={(v) => updateDeal("analyzer", v)} />}
          {activeTab === 1 && <Scorecard data={deal.scorecard} update={(v) => updateDeal("scorecard", v)} />}
          {activeTab === 2 && <ValueAdd data={deal.valueAdd} update={(v) => updateDeal("valueAdd", v)} />}
          {activeTab === 3 && <MarketCheck data={deal.marketCheck} update={(v) => updateDeal("marketCheck", v)} />}
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 10, color: "#2a3a52" }}>
          Built with AI \u00b7 Based on Justin Donald's MHP investment framework
        </div>
      </div>
    </div>
  );
}

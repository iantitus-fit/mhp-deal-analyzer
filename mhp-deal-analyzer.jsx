import { useState, useMemo } from "react";

const TABS = ["Analyzer", "Scorecard", "Value-Add", "Market Check"];

const fmtCurrency = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
};

const fmtPct = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return (n * 100).toFixed(1) + "%";
};

// ─── Shared Components ───────────────────────────────────────
function Input({ label, value, onChange, type = "number", prefix, suffix, hint, small }) {
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
function Analyzer() {
  const [lots, setLots] = useState(50);
  const [lotRent, setLotRent] = useState(200);
  const [utilPayer, setUtilPayer] = useState("tenant");
  const [targetCap, setTargetCap] = useState(10);
  const [pohCount, setPohCount] = useState(5);
  const [pohDecade, setPohDecade] = useState("90s");
  const [askingPrice, setAskingPrice] = useState(900000);
  const [interestRate, setInterestRate] = useState(5);

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
  const estimatedCoCR = spread > 0 ? spread / 0.25 : 0; // rough: 3pt spread ≈ 20% CoC

  return (
    <div>
      <SectionTitle>Deal Inputs</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Input label="Occupied Lots" value={lots} onChange={setLots} hint="Paying tenants only" />
        <Input label="Current Lot Rent" value={lotRent} onChange={setLotRent} prefix="$" suffix="/mo" />
        <Select label="Who Pays Utilities?" value={utilPayer} onChange={setUtilPayer}
          options={[{ value: "tenant", label: "Tenants pay direct (30% expense)" }, { value: "park", label: "Park pays / included (40% expense)" }]}
          hint={`Using ${expRatio}% expense ratio (×${expMultiplier === 0.7 ? "7" : "6"})`} />
        <Input label="Target Cap Rate" value={targetCap} onChange={setTargetCap} suffix="%" hint="Justin recommends 10% with upside" />
      </div>

      <SectionTitle>Park-Owned Homes</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Input label="# of Park-Owned Homes" value={pohCount} onChange={setPohCount} hint="Goal: as few as possible" />
        <Select label="Average Decade" value={pohDecade} onChange={setPohDecade}
          options={[{ value: "70s", label: "1970s ($3K each)" }, { value: "80s", label: "1980s ($5K each)" }, { value: "90s", label: "1990s ($10K each)" }, { value: "2000s", label: "2000s ($15K each)" }]} />
      </div>

      <SectionTitle>Your Offer Price</SectionTitle>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <ResultCard label="Offer @ 10 Cap" value={fmtCurrency(offerAt10)} sub={`Land: ${fmtCurrency(offerAt10 - totalPohValue)} + Homes: ${fmtCurrency(totalPohValue)}`} accent="green" />
        <ResultCard label={`Offer @ ${targetCap} Cap`} value={fmtCurrency(offerAtTarget)} sub={`NOI: ${fmtCurrency(noi)} / year`} accent="green" />
      </div>

      <SectionTitle>Compare to Asking Price</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Input label="Seller's Asking Price" value={askingPrice} onChange={setAskingPrice} prefix="$" />
        <Input label="Interest Rate Available" value={interestRate} onChange={setInterestRate} suffix="%" hint="For spread calculation" />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <ResultCard label="Implied Cap Rate" value={(impliedCap * 100).toFixed(1) + "%"} sub={impliedCap >= 0.10 ? "Meets 10-cap target" : "Below 10-cap — negotiate or value-add"} accent={impliedCap >= 0.10 ? "green" : impliedCap >= 0.08 ? "amber" : "red"} />
        <ResultCard label="Spread" value={(spread * 100).toFixed(1) + " pts"} sub={spread >= 0.03 ? "≥3pt spread — target 20%+ CoC" : "Below 3pt spread target"} accent={spread >= 0.03 ? "green" : spread >= 0.02 ? "amber" : "red"} />
        <ResultCard label="Est. Cash-on-Cash" value={fmtPct(estimatedCoCR)} sub="Based on spread (rough est.)" accent={estimatedCoCR >= 0.20 ? "green" : estimatedCoCR >= 0.15 ? "amber" : "red"} />
      </div>

      <div style={{ marginTop: 20, padding: "12px 14px", background: "#111827", borderRadius: 8, border: "1px solid #1e2d42" }}>
        <div style={{ fontSize: 11, color: "#5a7a9e", fontWeight: 600, marginBottom: 6 }}>FORMULA</div>
        <div style={{ fontSize: 12, color: "#8a9bb5", fontFamily: "monospace", lineHeight: 1.8 }}>
          {lots} lots × ${lotRent}/mo × {expMultiplier === 0.7 ? "0.70" : "0.60"} × 12 = <span style={{ color: "#60a5fa" }}>{fmtCurrency(noi)}</span> NOI<br />
          {fmtCurrency(noi)} ÷ {(targetCap / 100).toFixed(2)} = <span style={{ color: "#60a5fa" }}>{fmtCurrency(noi / (targetCap / 100))}</span> land value<br />
          + {pohCount} homes × {fmtCurrency(pohValues[pohDecade])} = <span style={{ color: "#60a5fa" }}>{fmtCurrency(totalPohValue)}</span><br />
          <span style={{ color: "#4ade80", fontWeight: 700 }}>Total offer: {fmtCurrency(offerAtTarget)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── SCORECARD TAB ───────────────────────────────────────────
function Scorecard() {
  const criteria = [
    { id: 1, name: "Legal Park", desc: "Confirmed legal or legal non-conforming. Call city building inspector.", hard: true },
    { id: 2, name: "Location", desc: "Midwest/Great Plains preferred. Avoid Deep South (except ATL, Birmingham). Avoid pro-tenant states (NY, NJ, CA). No rent control.", hard: true },
    { id: 3, name: "Size (50+ lots)", desc: "50-100+ units ideal. Same work for 25 as 50. Better exit options with more lots.", hard: true },
    { id: 4, name: "City Utilities", desc: "City water + city sewer. No well water, lagoons, treatment plants, or master meter electric/gas.", hard: true },
    { id: 5, name: "MSA 100K+ Population", desc: "Metro statistical area must be 100K+. Economic growth, diversified employers, not a one-trick pony town.", hard: true },
    { id: 6, name: "Cap Rate ≥ 10 (or path to 10)", desc: "Buy at 10 cap or buy at 8-9 with clear plan to reach 10 quickly via rent raises, expense cuts, vacancy fills.", hard: false },
    { id: 7, name: "Cash-on-Cash ≥ 20%", desc: "Need 3-point spread between interest rate and cap rate. More spread = more return.", hard: false },
    { id: 8, name: "Occupancy ≥ 70%", desc: "Banks require 70%+ for stabilized lending. 80%+ preferred. If low, must be poor management not weak market.", hard: false },
    { id: 9, name: "Few Park-Owned Homes", desc: "Fewer = less expense and oversight. Sell POH to residents on contract. Lot-rent-only is the goal.", hard: false },
    { id: 10, name: "Purchase Price in Range", desc: "Fits your capital or can find money for a great deal. Don't rule out bigger deals if fundamentals are strong.", hard: false },
  ];

  const [scores, setScores] = useState({});
  const toggle = (id) => setScores((prev) => {
    const val = prev[id];
    if (val === undefined) return { ...prev, [id]: true };
    if (val === true) return { ...prev, [id]: false };
    const next = { ...prev };
    delete next[id];
    return next;
  });

  const hardPass = criteria.filter((c) => c.hard && scores[c.id] === false).length;
  const greenCount = Object.values(scores).filter((v) => v === true).length;
  const redCount = Object.values(scores).filter((v) => v === false).length;

  let verdict = "Incomplete";
  let verdictColor = "#5a7a9e";
  if (greenCount + redCount === 10) {
    if (hardPass > 0) { verdict = "HARD PASS — Failed mandatory criteria"; verdictColor = "#f87171"; }
    else if (redCount === 0) { verdict = "GREEN LIGHT — Buy this park"; verdictColor = "#4ade80"; }
    else if (redCount <= 2) { verdict = "YELLOW — Negotiate or value-add needed"; verdictColor = "#fbbf24"; }
    else { verdict = "RED — Too many issues"; verdictColor = "#f87171"; }
  }

  return (
    <div>
      <SectionTitle>10-Point Investment Criteria</SectionTitle>
      <div style={{ fontSize: 11, color: "#5a7a9e", marginBottom: 16 }}>Click to cycle: ⬜ unchecked → ✅ pass → ❌ fail. Criteria 1-5 are hard requirements (can't be changed).</div>

      {criteria.map((c) => {
        const val = scores[c.id];
        const bg = val === true ? "#0d2e1f" : val === false ? "#2e0d0d" : "#151e2d";
        const border = val === true ? "#1a5c3a" : val === false ? "#5c1a1a" : "#222f42";
        const icon = val === true ? "✅" : val === false ? "❌" : "⬜";
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
        <div style={{ fontSize: 12, color: "#5a7a9e", marginTop: 6 }}>{greenCount} pass · {redCount} fail · {10 - greenCount - redCount} unchecked</div>
      </div>
    </div>
  );
}

// ─── VALUE-ADD TAB ───────────────────────────────────────────
function ValueAdd() {
  const [currentLots, setCurrentLots] = useState(50);
  const [currentRent, setCurrentRent] = useState(175);
  const [marketRent, setMarketRent] = useState(280);
  const [currentOccupancy, setCurrentOccupancy] = useState(70);
  const [targetOccupancy, setTargetOccupancy] = useState(90);
  const [utilPayer, setUtilPayer] = useState("park");
  const [capRate, setCapRate] = useState(10);

  const totalLots = Math.round(currentLots / (currentOccupancy / 100));
  const expMult = utilPayer === "tenant" ? 0.7 : 0.6;
  const billbackMult = 0.7;

  // Current state
  const currentNOI = currentLots * currentRent * expMult * 12;
  const currentValue = currentNOI / (capRate / 100);

  // After rent raise
  const afterRentNOI = currentLots * marketRent * expMult * 12;
  const afterRentValue = afterRentNOI / (capRate / 100);

  // After utility billback (if park currently pays)
  const afterUtilNOI = utilPayer === "park" ? currentLots * currentRent * billbackMult * 12 : currentNOI;
  const afterUtilValue = afterUtilNOI / (capRate / 100);

  // After filling vacancies
  const targetLots = Math.round(totalLots * (targetOccupancy / 100));
  const afterFillNOI = targetLots * currentRent * expMult * 12;
  const afterFillValue = afterFillNOI / (capRate / 100);

  // All three combined
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
        <Input label="Occupied Lots" value={currentLots} onChange={setCurrentLots} />
        <Input label="Current Lot Rent" value={currentRent} onChange={setCurrentRent} prefix="$" suffix="/mo" />
        <Input label="Market Lot Rent" value={marketRent} onChange={setMarketRent} prefix="$" suffix="/mo" hint="What comparable parks charge" />
        <Input label="Current Occupancy" value={currentOccupancy} onChange={setCurrentOccupancy} suffix="%" />
        <Input label="Target Occupancy" value={targetOccupancy} onChange={setTargetOccupancy} suffix="%" />
        <Select label="Who Pays Utilities Now?" value={utilPayer} onChange={setUtilPayer}
          options={[{ value: "park", label: "Park pays (can bill back)" }, { value: "tenant", label: "Tenants pay direct" }]} />
        <Input label="Cap Rate for Valuation" value={capRate} onChange={setCapRate} suffix="%" />
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
        <ResultCard label="NOI Increase" value={fmtCurrency(allThreeNOI - currentNOI)} sub={`${fmtCurrency(currentNOI)} → ${fmtCurrency(allThreeNOI)}`} accent="green" />
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: "#5a7a9e", lineHeight: 1.6 }}>
        Total lots in park (est.): {totalLots} · Lots to fill: {targetLots - currentLots} · Rent gap: {fmtCurrency(marketRent - currentRent)}/lot/mo
      </div>
    </div>
  );
}

// ─── MARKET CHECK TAB ────────────────────────────────────────
function MarketCheck() {
  const checks = [
    { cat: "Population & Economy", items: [
      { label: "MSA Population ≥ 100,000", source: "bestplaces.net → Metro", id: "pop" },
      { label: "Unemployment below US avg", source: "bestplaces.net → Economy", id: "unemp" },
      { label: "Diversified top 10 employers", source: "Wikipedia → City → Economy", id: "emp" },
      { label: "No single-employer dependency", source: "Check if #1 employer is 4x bigger than #2", id: "dep" },
      { label: "Walmart within reasonable distance", source: "Google Maps", id: "walmart" },
    ]},
    { cat: "Housing Market", items: [
      { label: "Median home price ≥ $100K (ideal $200K+)", source: "bestplaces.net → Housing", id: "homeprice" },
      { label: "2BR apartment rent ≥ $600", source: "bestplaces.net → Housing", id: "apt2" },
      { label: "3BR apartment rent ≥ $800", source: "bestplaces.net → Housing", id: "apt3" },
      { label: "Housing vacancy < 12.5% (ideal < 10%)", source: "bestplaces.net → Housing", id: "vacancy" },
    ]},
    { cat: "Park Specifics", items: [
      { label: "City water (not well)", source: "Seller / due diligence", id: "water" },
      { label: "City sewer (not lagoon/treatment plant)", source: "Seller / due diligence", id: "sewer" },
      { label: "No master meter electric", source: "Check meter — company name = good", id: "elec" },
      { label: "No master meter gas", source: "Seller / due diligence", id: "gas" },
      { label: "Density ≤ 15 units/acre (ideal 7)", source: "Plat map / aerial", id: "density" },
      { label: "Lots fit 14×46 minimum (ideal 14×80)", source: "Plat map / seller", id: "lotsize" },
      { label: "Not in pro-tenant / rent control state", source: "Avoid NY, NJ, CA", id: "state" },
      { label: "Not land-value-driven pricing", source: "Avoid FL, CA coastal — buy on income approach", id: "landval" },
    ]},
    { cat: "Deal Signals", items: [
      { label: "Lot rent $125-$200 (under market)", source: "Compare to bestplaces / comps", id: "lotrent" },
      { label: "Total home+lot ≤ $500/mo target", source: "Stays in affordability sweet spot", id: "afford" },
      { label: "Mix of old and new homes (roof check)", source: "Flat/metal = 70s-80s, pitched = 90s+", id: "mix" },
      { label: "Seller finance possible", source: "Ask 3 times: beginning, middle, end", id: "sf" },
    ]},
  ];

  const [states, setStates] = useState({});
  const toggle = (id) => setStates((prev) => {
    const val = prev[id];
    if (val === undefined) return { ...prev, [id]: true };
    if (val === true) return { ...prev, [id]: false };
    const next = { ...prev };
    delete next[id];
    return next;
  });

  const total = checks.reduce((sum, c) => sum + c.items.length, 0);
  const passed = Object.values(states).filter((v) => v === true).length;
  const failed = Object.values(states).filter((v) => v === false).length;

  return (
    <div>
      <SectionTitle>Market & Park Due Diligence Checklist</SectionTitle>
      <div style={{ fontSize: 11, color: "#5a7a9e", marginBottom: 16 }}>Click to cycle: ⬜ → ✅ → ❌. Use bestplaces.net, Wikipedia, and Google Maps to validate.</div>

      {checks.map((cat) => (
        <div key={cat.cat} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{cat.cat}</div>
          {cat.items.map((item) => {
            const val = states[item.id];
            const icon = val === true ? "✅" : val === false ? "❌" : "⬜";
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
        <span style={{ fontSize: 12, color: "#5a7a9e" }}> pass · </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#f87171" }}>{failed}</span>
        <span style={{ fontSize: 12, color: "#5a7a9e" }}> fail · </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#8a9bb5" }}>{total - passed - failed}</span>
        <span style={{ fontSize: 12, color: "#5a7a9e" }}> unchecked of {total}</span>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────
export default function MHPDealAnalyzer() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div style={{ minHeight: "100vh", background: "#0c1220", color: "#e8edf5", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 40px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>MHP Deal Analyzer</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e8edf5", margin: 0, lineHeight: 1.2 }}>Mobile Home Park<br />Investment Calculator</h1>
          <div style={{ fontSize: 11, color: "#4a5f7a", marginTop: 8 }}>Evaluate deals against proven investment criteria</div>
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
          {activeTab === 0 && <Analyzer />}
          {activeTab === 1 && <Scorecard />}
          {activeTab === 2 && <ValueAdd />}
          {activeTab === 3 && <MarketCheck />}
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 10, color: "#2a3a52" }}>
          Built with AI · Based on Justin Donald's MHP investment framework
        </div>
      </div>
    </div>
  );
}

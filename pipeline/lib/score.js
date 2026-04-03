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

  // 2 & 5. MSA population (deduplicated)
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

  // 3. Lot count — NEVER RED. <50 = BELOW_BUYBOX (→ GRAY), null = UNKNOWN (→ YELLOW)
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
      result.cityUtilities = { score: "PASS", detail: `${park.zip} in KUB service area` };
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

  // 8. Occupancy — always unknown
  result.occupancy = { score: "UNKNOWN", detail: "Not in PropStream data" };

  // 9. Few POH — always unknown
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

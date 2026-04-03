export function assignTier(hardStops, negotiable, opportunityScore) {
  // RED: any hard-stop FAIL (legalState, msaPopulation, cityUtilities)
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

  // YELLOW: everything else
  return "YELLOW";
}

export function generateGapChecklist(hardStops, negotiable, park) {
  const gaps = [];

  if (hardStops.lotCount?.score === "UNKNOWN") {
    gaps.push(`Get lot count: call ${park.county} County Assessor or check plat map`);
  }
  if (hardStops.cityUtilities?.score === "UNKNOWN") {
    gaps.push(`Verify utilities: call city building/planning dept for ${park.city}`);
  }
  if (hardStops.msaPopulation?.score === "UNKNOWN") {
    gaps.push(`Check MSA population at bestplaces.net for zip ${park.zip}`);
  }

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

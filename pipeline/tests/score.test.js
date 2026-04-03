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

  it("BELOW_BUYBOX for lot count < 50", () => {
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
    assert.equal(result.priceInRange.score, "PASS");
  });

  it("priceInRange FAIL when $/lot > $50K", () => {
    const result = scoreNegotiable(
      { lotCount: 20, assessedValue: 1200000 },
      { rent2BR: "1,050" }
    );
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
    assert.equal(result.undervalued, true);
  });

  it("computes total opportunity score", () => {
    const result = scoreOpportunities({ ownershipDate: "2005-01-01", ownerMailingState: "OH", taxStatus: "delinquent", assessedValue: 500000, lotCount: 85 });
    assert.equal(result.score, 4);
  });
});

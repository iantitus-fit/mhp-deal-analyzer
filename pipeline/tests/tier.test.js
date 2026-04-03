import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assignTier, generateGapChecklist } from "../lib/tier.js";

describe("assignTier", () => {
  it("RED when legal state fails", () => {
    const hardStops = { legalState: { score: "FAIL" }, msaPopulation: { score: "PASS" }, lotCount: { score: "PASS" }, cityUtilities: { score: "PASS" } };
    const negotiable = { capRate: { score: "PASS" }, cashOnCash: { score: "PASS" }, occupancy: { score: "UNKNOWN" }, fewPOH: { score: "UNKNOWN" }, priceInRange: { score: "PASS" } };
    assert.equal(assignTier(hardStops, negotiable, 3), "RED");
  });

  it("RED when MSA population fails", () => {
    const hardStops = { legalState: { score: "PASS" }, msaPopulation: { score: "FAIL" }, lotCount: { score: "PASS" }, cityUtilities: { score: "PASS" } };
    const negotiable = { capRate: { score: "PASS" }, cashOnCash: { score: "PASS" }, occupancy: { score: "UNKNOWN" }, fewPOH: { score: "UNKNOWN" }, priceInRange: { score: "PASS" } };
    assert.equal(assignTier(hardStops, negotiable, 3), "RED");
  });

  it("RED when city utilities confirmed FAIL", () => {
    const hardStops = { legalState: { score: "PASS" }, msaPopulation: { score: "PASS" }, lotCount: { score: "PASS" }, cityUtilities: { score: "FAIL" } };
    const negotiable = { capRate: { score: "PASS" }, cashOnCash: { score: "PASS" }, occupancy: { score: "UNKNOWN" }, fewPOH: { score: "UNKNOWN" }, priceInRange: { score: "PASS" } };
    assert.equal(assignTier(hardStops, negotiable, 3), "RED");
  });

  it("GRAY when lot count below buy box", () => {
    const hardStops = { legalState: { score: "PASS" }, msaPopulation: { score: "PASS" }, lotCount: { score: "BELOW_BUYBOX" }, cityUtilities: { score: "PASS" } };
    const negotiable = { capRate: { score: "PASS" }, cashOnCash: { score: "PASS" }, occupancy: { score: "UNKNOWN" }, fewPOH: { score: "UNKNOWN" }, priceInRange: { score: "PASS" } };
    assert.equal(assignTier(hardStops, negotiable, 2), "GRAY");
  });

  it("GRAY when lot count below buy box even with high opportunity", () => {
    const hardStops = { legalState: { score: "PASS" }, msaPopulation: { score: "PASS" }, lotCount: { score: "BELOW_BUYBOX" }, cityUtilities: { score: "PASS" } };
    const negotiable = { capRate: { score: "PASS" }, cashOnCash: { score: "PASS" }, occupancy: { score: "PASS" }, fewPOH: { score: "PASS" }, priceInRange: { score: "PASS" } };
    assert.equal(assignTier(hardStops, negotiable, 4), "GRAY");
  });

  it("GREEN when all hard-stops pass + negotiable >= 3 + opportunity >= 2", () => {
    const hardStops = { legalState: { score: "PASS" }, msaPopulation: { score: "PASS" }, lotCount: { score: "PASS" }, cityUtilities: { score: "PASS" } };
    const negotiable = { capRate: { score: "PASS" }, cashOnCash: { score: "PASS" }, occupancy: { score: "UNKNOWN" }, fewPOH: { score: "UNKNOWN" }, priceInRange: { score: "PASS" } };
    assert.equal(assignTier(hardStops, negotiable, 2), "GREEN");
  });

  it("YELLOW when hard-stops pass but has UNKNOWNs and low opportunity", () => {
    const hardStops = { legalState: { score: "PASS" }, msaPopulation: { score: "PASS" }, lotCount: { score: "UNKNOWN" }, cityUtilities: { score: "UNKNOWN" } };
    const negotiable = { capRate: { score: "UNKNOWN" }, cashOnCash: { score: "UNKNOWN" }, occupancy: { score: "UNKNOWN" }, fewPOH: { score: "UNKNOWN" }, priceInRange: { score: "UNKNOWN" } };
    assert.equal(assignTier(hardStops, negotiable, 1), "YELLOW");
  });

  it("YELLOW when negotiable pass count < 3 despite good opportunity", () => {
    const hardStops = { legalState: { score: "PASS" }, msaPopulation: { score: "PASS" }, lotCount: { score: "PASS" }, cityUtilities: { score: "PASS" } };
    const negotiable = { capRate: { score: "PASS" }, cashOnCash: { score: "PASS" }, occupancy: { score: "UNKNOWN" }, fewPOH: { score: "UNKNOWN" }, priceInRange: { score: "UNKNOWN" } };
    assert.equal(assignTier(hardStops, negotiable, 3), "YELLOW");
  });
});

describe("generateGapChecklist", () => {
  it("generates items for UNKNOWN hard-stops", () => {
    const hardStops = { legalState: { score: "PASS" }, msaPopulation: { score: "UNKNOWN" }, lotCount: { score: "UNKNOWN" }, cityUtilities: { score: "UNKNOWN" } };
    const negotiable = { capRate: { score: "UNKNOWN" }, cashOnCash: { score: "UNKNOWN" }, occupancy: { score: "UNKNOWN" }, fewPOH: { score: "UNKNOWN" }, priceInRange: { score: "UNKNOWN" } };
    const park = { county: "Blount", city: "Maryville", address: "123 Main St", zip: "37801" };
    const gaps = generateGapChecklist(hardStops, negotiable, park);
    assert.ok(gaps.length > 0);
    assert.ok(gaps.some(g => g.includes("lot count")));
    assert.ok(gaps.some(g => g.includes("occupancy") || g.includes("Verify occupancy")));
  });

  it("returns empty for all-PASS", () => {
    const hardStops = { legalState: { score: "PASS" }, msaPopulation: { score: "PASS" }, lotCount: { score: "PASS" }, cityUtilities: { score: "PASS" } };
    const negotiable = { capRate: { score: "PASS" }, cashOnCash: { score: "PASS" }, occupancy: { score: "PASS" }, fewPOH: { score: "PASS" }, priceInRange: { score: "PASS" } };
    const park = { county: "Knox", city: "Knoxville", address: "123 Main St", zip: "37914" };
    const gaps = generateGapChecklist(hardStops, negotiable, park);
    assert.equal(gaps.length, 0);
  });
});

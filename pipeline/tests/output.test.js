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
    assert.ok(deal.id);
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

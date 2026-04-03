import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMarketData, getCachedOrNull } from "../lib/enrich.js";

describe("parseMarketData", () => {
  const sampleMarkdown = `
# Knoxville, TN 37914

## Population
The metro area population is 893,690.

## Economy
The unemployment rate is 3.2%.
The median household income is $52,400.

## Housing
The median home price is $295,000.
Rental rates: Studio $750, 1-Bedroom $850, 2-Bedroom $1,050, 3-Bedroom $1,280.
The housing vacancy rate is 6.8%.
`;

  it("extracts MSA population", () => {
    const data = parseMarketData(sampleMarkdown);
    assert.ok(data.msaPopulation);
    assert.ok(data.msaPopulation.includes("893"));
  });

  it("extracts unemployment rate", () => {
    const data = parseMarketData(sampleMarkdown);
    assert.equal(data.unemploymentRate, "3.2");
  });

  it("extracts median home price", () => {
    const data = parseMarketData(sampleMarkdown);
    assert.ok(data.medianHomePrice);
    assert.ok(data.medianHomePrice.includes("295"));
  });

  it("extracts 2BR rent", () => {
    const data = parseMarketData(sampleMarkdown);
    assert.ok(data.rent2BR);
    assert.ok(data.rent2BR.includes("1,050") || data.rent2BR.includes("1050"));
  });

  it("extracts 3BR rent", () => {
    const data = parseMarketData(sampleMarkdown);
    assert.ok(data.rent3BR);
    assert.ok(data.rent3BR.includes("1,280") || data.rent3BR.includes("1280"));
  });

  it("extracts vacancy rate", () => {
    const data = parseMarketData(sampleMarkdown);
    assert.equal(data.vacancyRate, "6.8");
  });

  it("extracts city/state", () => {
    const data = parseMarketData(sampleMarkdown);
    assert.equal(data.cityName, "Knoxville");
    assert.equal(data.stateName, "TN");
  });

  it("returns nulls for empty markdown", () => {
    const data = parseMarketData("");
    assert.equal(data.msaPopulation, null);
    assert.equal(data.unemploymentRate, null);
  });
});

describe("getCachedOrNull", () => {
  it("returns null for non-existent cache", async () => {
    const result = await getCachedOrNull("/tmp/nonexistent-cache-dir-abc123", "99999");
    assert.equal(result, null);
  });
});

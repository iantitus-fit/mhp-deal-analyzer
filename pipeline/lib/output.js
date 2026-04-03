import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { THRESHOLDS } from "../config.js";

export function buildFullReport(results) {
  return JSON.stringify(results, null, 2);
}

export function buildDealsImport(results) {
  const now = new Date().toISOString();
  const deals = results.map((r) => {
    const rent2BR = r.market ? parseFloat(String(r.market.rent2BR || "0").replace(/[$,]/g, "")) : 0;
    const estimatedRent = rent2BR ? Math.round(rent2BR * THRESHOLDS.LOT_RENT_MULTIPLIER) : 200;
    const lots = r.park.lotCount || 50;

    return {
      id: randomUUID(),
      name: `${r.park.name} — ${r.park.city} ${r.park.zip} [${r.tier}]`,
      createdAt: now,
      analyzer: {
        lots,
        lotRent: estimatedRent,
        utilPayer: "tenant",
        targetCap: 10,
        pohCount: 0,
        pohDecade: "90s",
        askingPrice: r.park.assessedValue || 0,
        interestRate: 5.5,
      },
      scorecard: {},
      valueAdd: {
        currentLots: lots,
        currentRent: estimatedRent,
        marketRent: estimatedRent,
        currentOccupancy: 70,
        targetOccupancy: 90,
        utilPayer: "tenant",
        capRate: 10,
      },
      marketCheck: {
        states: {},
        zip: r.park.zip || "",
        firecrawlKey: "",
        marketData: r.market || null,
      },
    };
  });

  return JSON.stringify(deals, null, 2);
}

export function buildSummary(results, inputFile) {
  const now = new Date().toISOString();
  const tiers = { GREEN: [], YELLOW: [], GRAY: [], RED: [] };
  for (const r of results) {
    (tiers[r.tier] || tiers.RED).push(r);
  }

  const lines = [];
  lines.push("MHP Deal Sourcing Pipeline — Knox County TN");
  lines.push(`Run: ${now}`);
  lines.push(`Input: ${results.length} parks from ${inputFile}`);
  lines.push("");
  lines.push("═══ TIER SUMMARY ═══");
  for (const tier of ["GREEN", "YELLOW", "GRAY", "RED"]) {
    const count = tiers[tier].length;
    lines.push(`${tier.padEnd(8)} ${count} park${count !== 1 ? "s" : ""}`);
  }

  const ranked = [...results]
    .filter(r => r.tier !== "RED")
    .sort((a, b) => b.opportunityScore - a.opportunityScore || b.negotiablePassCount - a.negotiablePassCount);

  if (ranked.length > 0) {
    lines.push("");
    lines.push("═══ TOP OPPORTUNITIES (by signal density) ═══");
    ranked.forEach((r, i) => {
      const lots = r.park.lotCount ? `${r.park.lotCount} lots` : "? lots";
      lines.push(`${i + 1}. [${r.tier}] ${r.park.name} — ${lots} — ${r.park.city} ${r.park.zip} — Score: ${r.opportunityScore}/4`);

      const signals = [];
      if (r.opportunities.longOwnership) {
        const years = r.park.ownershipDate ? Math.floor((Date.now() - new Date(r.park.ownershipDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : "?";
        signals.push(`long ownership (${years}yr)`);
      }
      if (r.opportunities.outOfState) signals.push(`out-of-state (${r.park.ownerMailingState})`);
      if (r.opportunities.taxDelinquent) signals.push("tax delinquent");
      if (r.opportunities.undervalued) {
        const perLot = r.park.lotCount ? `$${(r.park.assessedValue / r.park.lotCount / 1000).toFixed(1)}K/lot` : "undervalued";
        signals.push(`undervalued (${perLot})`);
      }
      if (signals.length) lines.push(`   Signals: ${signals.join(", ")}`);

      if (r.gapChecklist.length > 0) {
        lines.push(`   Gaps: ${r.gapChecklist.length} items`);
      }
    });
  }

  if (tiers.YELLOW.length > 0) {
    lines.push("");
    lines.push("═══ YELLOW PARKS — GAP REPORT ═══");
    for (const r of tiers.YELLOW) {
      lines.push(`${r.park.name} (${r.park.city} ${r.park.zip}):`);
      for (const gap of r.gapChecklist) {
        lines.push(`  [ ] ${gap}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

export async function writeOutputFiles(results, inputFile, outputDir) {
  await mkdir(outputDir, { recursive: true });

  const fullReportPath = join(outputDir, "full-report.json");
  const dealsImportPath = join(outputDir, "deals-import.json");
  const summaryPath = join(outputDir, "summary.txt");

  await Promise.all([
    writeFile(fullReportPath, buildFullReport(results)),
    writeFile(dealsImportPath, buildDealsImport(results)),
    writeFile(summaryPath, buildSummary(results, inputFile)),
  ]);

  return { fullReportPath, dealsImportPath, summaryPath };
}

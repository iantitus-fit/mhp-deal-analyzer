#!/usr/bin/env node
// pipeline/run.js — MHP Deal Sourcing Pipeline entry point
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestCSV } from "./lib/ingest.js";
import { enrichAllZips } from "./lib/enrich.js";
import { scoreHardStops, scoreNegotiable, scoreOpportunities } from "./lib/score.js";
import { assignTier, generateGapChecklist } from "./lib/tier.js";
import { writeOutputFiles } from "./lib/output.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    csvPath: null,
    skipEnrich: false,
    cacheDir: resolve(__dirname, ".cache"),
    outputDir: resolve(__dirname, "output"),
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--skip-enrich") {
      options.skipEnrich = true;
    } else if (args[i] === "--cache-dir" && args[i + 1]) {
      options.cacheDir = resolve(args[++i]);
    } else if (args[i] === "--output-dir" && args[i + 1]) {
      options.outputDir = resolve(args[++i]);
    } else if (!args[i].startsWith("--")) {
      options.csvPath = resolve(args[i]);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv);
  const apiKey = process.env.FIRECRAWL_API_KEY || "";

  if (!options.csvPath) {
    console.error("Usage: node pipeline/run.js <csv-file> [--skip-enrich] [--cache-dir <dir>]");
    process.exit(1);
  }

  console.log("╔══════════════════════════════════════════╗");
  console.log("║   MHP Deal Sourcing Pipeline             ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\nInput:  ${options.csvPath}`);
  console.log(`Cache:  ${options.cacheDir}`);
  console.log(`Output: ${options.outputDir}`);
  if (options.skipEnrich) console.log("Mode:   --skip-enrich (using cache only)");
  if (!apiKey && !options.skipEnrich) console.log("⚠  No FIRECRAWL_API_KEY — market enrichment will be skipped");

  // Phase 1: Ingest
  console.log("\n── Phase 1: Ingest CSV ──");
  const parks = await ingestCSV(options.csvPath);
  console.log(`Loaded ${parks.length} park records`);
  const warnings = parks.filter(p => p.validation.length > 0);
  if (warnings.length) console.log(`⚠  ${warnings.length} records have validation warnings`);

  // Phase 2: Enrich
  console.log("\n── Phase 2: Market Enrichment ──");
  const marketByZip = await enrichAllZips(parks, {
    apiKey,
    cacheDir: options.cacheDir,
    skipEnrich: options.skipEnrich || !apiKey,
  });

  // Phases 3-6: Score, Tier, Gap
  console.log("\n── Phases 3-6: Score & Tier ──");
  const results = parks.map((park) => {
    const market = marketByZip[park.zip] || null;
    const hardStops = scoreHardStops(park, market);
    const negotiable = scoreNegotiable(park, market);
    const opportunities = scoreOpportunities(park);
    const tier = assignTier(hardStops, negotiable, opportunities.score);
    const gapChecklist = tier === "YELLOW" ? generateGapChecklist(hardStops, negotiable, park) : [];

    const negotiablePassCount = Object.values(negotiable).filter(e => e.score === "PASS").length;
    const negotiableUnknownCount = Object.values(negotiable).filter(e => e.score === "UNKNOWN").length;

    return {
      park,
      market,
      hardStops,
      negotiable,
      opportunities,
      tier,
      opportunityScore: opportunities.score,
      negotiablePassCount,
      negotiableUnknownCount,
      gapChecklist,
    };
  });

  // Sort within tiers
  results.sort((a, b) => {
    const tierOrder = { GREEN: 0, YELLOW: 1, GRAY: 2, RED: 3 };
    const tierDiff = (tierOrder[a.tier] ?? 4) - (tierOrder[b.tier] ?? 4);
    if (tierDiff !== 0) return tierDiff;
    if (b.opportunityScore !== a.opportunityScore) return b.opportunityScore - a.opportunityScore;
    return b.negotiablePassCount - a.negotiablePassCount;
  });

  // Output
  console.log("\n── Writing Output ──");
  const paths = await writeOutputFiles(results, options.csvPath, options.outputDir);

  // Summary
  const tierCounts = { GREEN: 0, YELLOW: 0, GRAY: 0, RED: 0 };
  results.forEach(r => tierCounts[r.tier]++);

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   Results                                ║");
  console.log("╠══════════════════════════════════════════╣");
  console.log(`║   GREEN:  ${String(tierCounts.GREEN).padEnd(3)} parks                      ║`);
  console.log(`║   YELLOW: ${String(tierCounts.YELLOW).padEnd(3)} parks                      ║`);
  console.log(`║   GRAY:   ${String(tierCounts.GRAY).padEnd(3)} parks                      ║`);
  console.log(`║   RED:    ${String(tierCounts.RED).padEnd(3)} parks                      ║`);
  console.log("╠══════════════════════════════════════════╣");
  console.log(`║   Full report:   ${paths.fullReportPath}`);
  console.log(`║   Deals import:  ${paths.dealsImportPath}`);
  console.log(`║   Summary:       ${paths.summaryPath}`);
  console.log("╚══════════════════════════════════════════╝");
}

main().catch((err) => {
  console.error("\n✗ Pipeline failed:", err.message);
  process.exit(1);
});

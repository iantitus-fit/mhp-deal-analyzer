import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function parseMarketData(markdown) {
  const data = {
    msaPopulation: null,
    medianHomePrice: null,
    medianHouseholdIncome: null,
    unemploymentRate: null,
    rent2BR: null,
    rent3BR: null,
    vacancyRate: null,
    cityName: null,
    stateName: null,
    topEmployers: null,
  };

  if (!markdown) return data;

  // City/State from header
  const cityMatch = markdown.match(/(?:^|\n)#?\s*([A-Z][a-zA-Z\s]+?),?\s+([A-Z]{2})(?:\s|\n|$)/m);
  if (cityMatch) {
    data.cityName = cityMatch[1].trim();
    data.stateName = cityMatch[2];
  }

  // MSA / metro population
  const popMatch = markdown.match(/(?:metro|msa|metropolitan).*?(?:population|pop)[^\d]*?([\d,]+)/i)
    || markdown.match(/(?:population|pop).*?(?:metro|msa|metropolitan)[^\d]*?([\d,]+)/i)
    || markdown.match(/(?:area\s+population|population)[^\d]*?([\d,]+)/i);
  if (popMatch) data.msaPopulation = popMatch[1];

  // Median home price
  const homeMatch = markdown.match(/median\s+home\s+(?:price|value|cost)[^\$]*?\$([\d,]+)/i)
    || markdown.match(/\$([\d,]+).*?median.*?home/i);
  if (homeMatch) data.medianHomePrice = homeMatch[1];

  // Median household income
  const incomeMatch = markdown.match(/median\s+(?:household\s+)?income[^\$]*?\$([\d,]+)/i);
  if (incomeMatch) data.medianHouseholdIncome = incomeMatch[1];

  // Unemployment
  const unempMatch = markdown.match(/unemploy[^\d]*?([\d.]+)\s*%/i);
  if (unempMatch) data.unemploymentRate = unempMatch[1];

  // 2BR rent
  const rent2Match = markdown.match(/2[\s-]*(?:br|bed|bedroom)[^\$]*?\$([\d,]+)/i)
    || markdown.match(/\$([\d,]+).*?2[\s-]*(?:br|bed|bedroom)/i);
  if (rent2Match) data.rent2BR = rent2Match[1];

  // 3BR rent
  const rent3Match = markdown.match(/3[\s-]*(?:br|bed|bedroom)[^\$]*?\$([\d,]+)/i)
    || markdown.match(/\$([\d,]+).*?3[\s-]*(?:br|bed|bedroom)/i);
  if (rent3Match) data.rent3BR = rent3Match[1];

  // Vacancy rate
  const vacMatch = markdown.match(/(?:housing\s+)?vacanc[yi][^\d]*?([\d.]+)\s*%/i);
  if (vacMatch) data.vacancyRate = vacMatch[1];

  return data;
}

export function parseEmployers(markdown) {
  if (!markdown) return [];
  const employers = [];
  const employerSection = markdown.match(/(?:(?:top|major|largest)\s+employers|economy)[\s\S]*?(?:\n#{1,3}\s|\n\n\n|$)/i);
  if (employerSection) {
    const lines = employerSection[0].split("\n");
    for (const line of lines) {
      const match = line.match(/(?:\|\s*|[-*]\s+|^\d+[.)]\s*)([A-Z][A-Za-z\s&'.,-]+?)(?:\s*\||\s*[-\u2013]\s*[\d,]+|\s*$)/);
      if (match && match[1].trim().length > 2 && employers.length < 10) {
        const name = match[1].trim();
        if (!/^(rank|employer|company|name|#|number)/i.test(name)) {
          employers.push(name);
        }
      }
    }
  }
  return employers;
}

export async function getCachedOrNull(cacheDir, zip) {
  try {
    const cachePath = join(cacheDir, `${zip}.json`);
    const fileStat = await stat(cachePath);
    const age = Date.now() - fileStat.mtimeMs;
    if (age > CACHE_MAX_AGE_MS) return null;
    const raw = await readFile(cachePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveCache(cacheDir, zip, data) {
  await mkdir(cacheDir, { recursive: true });
  const cachePath = join(cacheDir, `${zip}.json`);
  await writeFile(cachePath, JSON.stringify(data, null, 2));
}

async function firecrawlScrape(apiKey, url) {
  const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ url, formats: ["markdown"] }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Firecrawl error ${res.status}`);
  }
  const json = await res.json();
  return json.data?.markdown || "";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function enrichZip(zip, { apiKey, cacheDir, skipEnrich = false }) {
  const cached = await getCachedOrNull(cacheDir, zip);
  if (cached) {
    console.log(`  [cache hit] ${zip}`);
    return cached;
  }

  if (skipEnrich || !apiKey) {
    console.log(`  [skip] ${zip} — no API key or --skip-enrich`);
    return null;
  }

  console.log(`  [scraping] bestplaces.net for ${zip}...`);
  try {
    const bpMarkdown = await firecrawlScrape(apiKey, `https://www.bestplaces.net/zip-code/${zip}`);
    const data = parseMarketData(bpMarkdown);
    data.zip = zip;

    if (data.cityName && data.stateName) {
      try {
        await sleep(1000);
        const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(data.cityName.replace(/\s/g, "_"))},_${data.stateName}`;
        console.log(`  [scraping] Wikipedia for ${data.cityName}, ${data.stateName}...`);
        const wikiMarkdown = await firecrawlScrape(apiKey, wikiUrl);
        data.topEmployers = parseEmployers(wikiMarkdown);
      } catch (err) {
        console.warn(`  [warn] Wikipedia scrape failed for ${data.cityName}: ${err.message}`);
      }
    }

    await saveCache(cacheDir, zip, data);
    await sleep(1000);
    return data;
  } catch (err) {
    console.warn(`  [warn] Firecrawl failed for ${zip}: ${err.message}`);
    return null;
  }
}

export async function enrichAllZips(parks, options) {
  const uniqueZips = [...new Set(parks.map(p => p.zip).filter(Boolean))];
  console.log(`\nEnriching ${uniqueZips.length} unique zip codes...\n`);

  const marketByZip = {};
  for (const zip of uniqueZips) {
    marketByZip[zip] = await enrichZip(zip, options);
  }
  return marketByZip;
}

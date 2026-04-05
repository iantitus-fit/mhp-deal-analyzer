// Firecrawl bestplaces.net + Wikipedia scraper
export async function scrapeWithFirecrawl(apiKey, zip) {
  const baseUrl = "https://api.firecrawl.dev/v1";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };

  const scrape = async (url) => {
    const res = await fetch(`${baseUrl}/scrape`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, formats: ["markdown"] }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Firecrawl error ${res.status}`);
    }
    const json = await res.json();
    return json.data?.markdown || "";
  };

  const bestplacesUrl = `https://www.bestplaces.net/zip-code/${zip}`;
  const bpMarkdown = await scrape(bestplacesUrl);
  const marketData = {};

  const popMatch = bpMarkdown.match(/(?:metro|msa|metropolitan).*?(?:population|pop)[^\d]*?([\d,]+)/i)
    || bpMarkdown.match(/(?:population|pop).*?(?:metro|msa|metropolitan)[^\d]*?([\d,]+)/i)
    || bpMarkdown.match(/(?:population)[^\d]*?([\d,]+)/i);
  if (popMatch) marketData.msaPopulation = popMatch[1];

  const homeMatch = bpMarkdown.match(/median\s+home\s+(?:price|value|cost)[^\$]*?\$([\d,]+)/i)
    || bpMarkdown.match(/\$([\d,]+).*?median.*?home/i);
  if (homeMatch) marketData.medianHomePrice = homeMatch[1];

  const rent2Match = bpMarkdown.match(/2[\s-]*(?:br|bed|bedroom)[^\$]*?\$([\d,]+)/i)
    || bpMarkdown.match(/\$([\d,]+).*?2[\s-]*(?:br|bed|bedroom)/i);
  if (rent2Match) marketData.rent2BR = rent2Match[1];

  const rent3Match = bpMarkdown.match(/3[\s-]*(?:br|bed|bedroom)[^\$]*?\$([\d,]+)/i)
    || bpMarkdown.match(/\$([\d,]+).*?3[\s-]*(?:br|bed|bedroom)/i);
  if (rent3Match) marketData.rent3BR = rent3Match[1];

  const vacMatch = bpMarkdown.match(/(?:housing\s+)?vacanc[yi][^\d]*?([\d.]+)\s*%/i);
  if (vacMatch) marketData.vacancyRate = vacMatch[1];

  const unempMatch = bpMarkdown.match(/unemploy[^\d]*?([\d.]+)\s*%/i);
  if (unempMatch) marketData.unemploymentRate = unempMatch[1];

  const cityMatch = bpMarkdown.match(/(?:^|\n)#?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),?\s*([A-Z]{2})/m);
  let cityName = "", stateName = "";
  if (cityMatch) { cityName = cityMatch[1]; stateName = cityMatch[2]; }

  if (cityName) {
    try {
      const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(cityName.replace(/\s/g, "_"))},_${stateName}`;
      const wikiMarkdown = await scrape(wikiUrl);
      const employers = [];
      const employerSection = wikiMarkdown.match(/(?:(?:top|major|largest)\s+employers|economy)[\s\S]*?(?:\n#{1,3}\s|\n\n\n|$)/i);
      if (employerSection) {
        const lines = employerSection[0].split("\n");
        for (const line of lines) {
          const match = line.match(/(?:\|\s*|[-*]\s+|^\d+[.)]\s*)([A-Z][A-Za-z\s&'.,-]+?)(?:\s*\||\s*[-\u2013]\s*[\d,]+|\s*$)/);
          if (match && match[1].trim().length > 2 && employers.length < 10) {
            const name = match[1].trim();
            if (!/^(rank|employer|company|name|#|number)/i.test(name)) employers.push(name);
          }
        }
      }
      if (employers.length > 0) marketData.topEmployers = employers;
      marketData.cityName = cityName;
      marketData.stateName = stateName;
    } catch {}
  }

  return marketData;
}

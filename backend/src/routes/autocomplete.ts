import { Router, Request, Response } from "express";

export const autocompleteRouter = Router();

interface ZillowResult {
  display: string;
  resultType: string;
  metaData: {
    regionId?: number;
    regionType?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
}

/**
 * Build the Zillow search URL from autocomplete metadata.
 * Zillow uses slugs like /miami-fl/ for city searches.
 */
function buildSearchUrl(result: ZillowResult): string {
  const meta = result.metaData;

  // For zipcodes, use the zipcode directly
  if (meta.regionType === "zipcode") {
    return `https://www.zillow.com/homes/${result.display}_rb/`;
  }

  // For neighborhoods, use city + neighborhood pattern
  if (meta.regionType === "neighborhood" && meta.city && meta.state) {
    const display = result.display.split(",")[0].trim();
    const slug = `${display}-${meta.city}-${meta.state}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    return `https://www.zillow.com/${slug}/`;
  }

  // For counties
  if (meta.regionType === "county" && meta.county && meta.state) {
    const slug = `${meta.county}-${meta.state}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    return `https://www.zillow.com/${slug}/`;
  }

  // For cities (most common)
  if (meta.city && meta.state) {
    const slug = `${meta.city}-${meta.state}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    return `https://www.zillow.com/${slug}/`;
  }

  // Fallback: use display text as slug
  const slug = result.display
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `https://www.zillow.com/homes/${slug}_rb/`;
}

autocompleteRouter.get("/", async (req: Request, res: Response) => {
  const query = (req.query.q as string)?.trim();
  if (!query) {
    res.json({ suggestions: [] });
    return;
  }

  try {
    // Use Zillow's public autocomplete API directly — fast and no captcha
    const apiUrl = `https://www.zillowstatic.com/autocomplete/v3/suggestions?q=${encodeURIComponent(query)}`;
    const apiRes = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    if (!apiRes.ok) {
      throw new Error(`Zillow autocomplete API returned ${apiRes.status}`);
    }

    const data = await apiRes.json();
    const results: ZillowResult[] = data.results ?? [];

    const suggestions = results.map((r) => ({
      text: r.display,
      url: buildSearchUrl(r),
      type: r.metaData.regionType ?? r.resultType ?? "unknown",
    }));

    res.json({ suggestions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Autocomplete error:", msg);
    res.status(500).json({ error: msg });
  }
});

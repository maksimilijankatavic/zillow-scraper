import {
  createSteelSession,
  releaseSteelSession,
  SteelSession,
} from "./steelClient";
import { ListingData } from "../schema/dynamicSchema";
import { JobLogger } from "../logging/logger";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Scrape a single Zillow listing page and extract all available data. */
export async function scrapeListingPage(
  url: string,
  logger: JobLogger
): Promise<ListingData> {
  let session: SteelSession | null = null;
  try {
    session = await createSteelSession();
    const { page } = session;

    logger.info(`Navigating to listing: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await wait(3000);

    // Scroll down to trigger lazy loading of facts, history, etc.
    await page.evaluate(async () => {
      for (let i = 0; i < 8; i++) {
        window.scrollBy(0, 1000);
        await new Promise((r) => setTimeout(r, 400));
      }
      window.scrollTo(0, 0);
    });
    await wait(2000);

    // Try to click "See more facts and features" and expand buttons
    try {
      const buttons = await page.$$("button");
      for (const btn of buttons) {
        const text = await btn.evaluate((el) => el.textContent?.trim() ?? "");
        if (
          /see (more|all|complete)/i.test(text) ||
          /show more/i.test(text) ||
          /see full/i.test(text)
        ) {
          try {
            await btn.click();
            await wait(500);
          } catch {}
        }
      }
    } catch {}

    await wait(1000);

    const data = await page.evaluate(() => {
      const result: Record<string, unknown> = {};
      const bodyText = document.body.innerText;

      // === Address ===
      const addressEl =
        document.querySelector("h1") ??
        document.querySelector('[data-testid="bdp-property-address"]');
      result.address = addressEl?.textContent?.trim() ?? null;

      // === Price ===
      // The main price is in a span with data-testid="price" or a prominent price class
      const priceEl = document.querySelector(
        '[data-testid="price"], span[class*="StyledPrice" i]'
      );
      if (priceEl) {
        result.price = priceEl.textContent?.trim() ?? null;
      } else {
        // Fallback: find the first large dollar amount on the page
        const match = bodyText.match(/\$[\d,]+(?:,\d{3})+/);
        result.price = match ? match[0] : null;
      }

      // === Zestimate ===
      // Pattern: "$329,700 Zestimate®" — dollar amount immediately before "Zestimate"
      const zestMatch = bodyText.match(/\$([\d,]+)\s*Zestimate/i);
      result.zestimate = zestMatch ? `$${zestMatch[1]}` : null;

      // === Estimated sales range ===
      const rangeMatch = bodyText.match(
        /Estimated\s+sale(?:s)?\s+range[:\s]*(\$[\d,]+\s*[-–]\s*\$[\d,]+)/i
      );
      result.estimated_sales_range = rangeMatch ? rangeMatch[1].trim() : null;

      // === Rent Zestimate ===
      const rentMatch = bodyText.match(/Rent\s+Zestimate[®:\s]*\$([\d,]+)/i);
      result.rent_zestimate = rentMatch ? `$${rentMatch[1]}` : null;

      // === Facts & Features ===
      // Zillow renders facts as <li> elements with "key: value" text inside fact containers
      const factSelectors = [
        '[class*="fact" i] li',
        '[data-testid*="fact"] li',
        '.data-view-container li',
      ];

      const seenFacts = new Set<string>();
      for (const sel of factSelectors) {
        document.querySelectorAll(sel).forEach((li) => {
          const text = li.textContent?.trim() ?? "";
          if (text.includes(":") && !seenFacts.has(text)) {
            seenFacts.add(text);
            const colonIdx = text.indexOf(":");
            const rawKey = text.slice(0, colonIdx).trim();
            const val = text.slice(colonIdx + 1).trim();
            if (rawKey && val && rawKey.length < 60) {
              const key = rawKey.toLowerCase().replace(/[\s/]+/g, "_").replace(/[^a-z0-9_]/g, "");
              result[`fact_${key}`] = val;
            }
          }
        });
      }

      // Also extract from h4/h5 section headers + their sibling lists
      document.querySelectorAll("h4, h5, h6").forEach((h) => {
        const sectionTitle = h.textContent?.trim() ?? "";
        // Only process factual sections (skip nav/footer sections)
        const factSections = [
          "bedrooms", "bathrooms", "parking", "type", "style", "condition",
          "interior", "exterior", "heating", "cooling", "appliances",
          "flooring", "property", "lot", "construction", "utilities",
          "community", "hoa", "financial", "other"
        ];
        const isFactSection = factSections.some((s) =>
          sectionTitle.toLowerCase().includes(s)
        );
        if (!isFactSection) return;

        const nextEl = h.nextElementSibling;
        if (!nextEl) return;
        nextEl.querySelectorAll("li").forEach((li) => {
          const text = li.textContent?.trim() ?? "";
          if (text.includes(":") && !seenFacts.has(text)) {
            seenFacts.add(text);
            const colonIdx = text.indexOf(":");
            const rawKey = text.slice(0, colonIdx).trim();
            const val = text.slice(colonIdx + 1).trim();
            if (rawKey && val && rawKey.length < 60) {
              const key = rawKey.toLowerCase().replace(/[\s/]+/g, "_").replace(/[^a-z0-9_]/g, "");
              result[`fact_${key}`] = val;
            }
          }
        });
      });

      // === Price History ===
      const priceHistoryRows: unknown[] = [];
      // Try table-based extraction first
      document.querySelectorAll("table").forEach((table) => {
        const section = table.closest("section, div");
        const header = section?.querySelector("h2, h3, h4, h5");
        if (header && /price\s*history/i.test(header.textContent ?? "")) {
          table.querySelectorAll("tbody tr").forEach((tr) => {
            const cells = tr.querySelectorAll("td");
            if (cells.length >= 3) {
              priceHistoryRows.push([
                cells[0].textContent?.trim(),
                cells[1].textContent?.trim(),
                cells[2].textContent?.trim(),
              ]);
            }
          });
        }
      });
      result.price_history = priceHistoryRows.length > 0 ? priceHistoryRows : null;

      // === Public Tax History ===
      const taxRows: unknown[] = [];
      document.querySelectorAll("table").forEach((table) => {
        const section = table.closest("section, div");
        const header = section?.querySelector("h2, h3, h4, h5");
        if (header && /tax\s*history/i.test(header.textContent ?? "")) {
          table.querySelectorAll("tbody tr").forEach((tr) => {
            const cells = tr.querySelectorAll("td");
            if (cells.length >= 3) {
              taxRows.push([
                cells[0].textContent?.trim(),
                cells[1].textContent?.trim(),
                cells[2].textContent?.trim(),
              ]);
            }
          });
        }
      });
      result.public_tax_history = taxRows.length > 0 ? taxRows : null;

      return result;
    });

    data.link = url;
    return data as ListingData;
  } finally {
    if (session) await releaseSteelSession(session);
  }
}

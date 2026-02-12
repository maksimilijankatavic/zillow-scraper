import { Page } from "puppeteer-core";
import { JobLogger } from "../logging/logger";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Extract listing URLs from a Zillow search results page.
 * Returns an array of absolute listing URLs.
 */
export async function extractListingUrls(page: Page): Promise<string[]> {
  // Scroll down to ensure lazy-loaded listing cards render
  await page.evaluate(async () => {
    const container = document.querySelector('[id*="search-page-list"]') ?? document.documentElement;
    for (let i = 0; i < 5; i++) {
      container.scrollBy(0, 800);
      await new Promise((r) => setTimeout(r, 600));
    }
    container.scrollTop = 0;
  });
  await wait(2000);

  const urls = await page.evaluate(() => {
    const links: string[] = [];
    const seen = new Set<string>();

    // Zillow listing cards link pattern: /homedetails/..._zpid/
    document.querySelectorAll('a[href*="/homedetails/"]').forEach((a) => {
      const href = (a as HTMLAnchorElement).href;
      // Dedup by zpid (the unique listing ID in the URL)
      const zpidMatch = href.match(/(\d+)_zpid/);
      const key = zpidMatch ? zpidMatch[1] : href.split("?")[0];
      if (!seen.has(key)) {
        seen.add(key);
        links.push(href.split("?")[0]); // clean URL without query params
      }
    });

    return links;
  });

  return urls;
}

/**
 * Check if there's a next page button and navigate to it.
 * Returns true if navigation to next page succeeded.
 */
export async function goToNextPage(
  page: Page,
  logger: JobLogger
): Promise<boolean> {
  try {
    // Zillow pagination: look for next page link with multiple selector strategies
    const selectors = [
      'a[rel="next"]',
      'a[title="Next page"]',
      '[aria-label="Next page"]',
      'li[class*="PaginationJumpItem"] a[href]:last-of-type', // Zillow pagination items
    ];

    let nextButton = null;
    for (const sel of selectors) {
      nextButton = await page.$(sel);
      if (nextButton) break;
    }

    // Fallback: find a pagination link by looking at the current URL pattern
    if (!nextButton) {
      const currentUrl = page.url();
      const pageMatch = currentUrl.match(/(\d+)_p\//);
      const currentPage = pageMatch ? parseInt(pageMatch[1]) : 1;
      const nextPageUrl = currentUrl.includes("_p/")
        ? currentUrl.replace(/\d+_p\//, `${currentPage + 1}_p/`)
        : currentUrl.replace(/\/$/, `/${currentPage + 1}_p/`);

      logger.info(`Navigating to next page URL: ${nextPageUrl}`);
      await page.goto(nextPageUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      await wait(3000);

      // Check if the page has listings (not a 404 or empty page)
      const hasListings = await page.evaluate(() => {
        return document.querySelectorAll('a[href*="/homedetails/"]').length > 0;
      });

      if (!hasListings) {
        logger.info("Next page has no listings — end of results.");
        return false;
      }
      return true;
    }

    logger.info("Navigating to next results page...");
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 }),
      nextButton.click(),
    ]);
    await wait(3000);
    return true;
  } catch (err) {
    logger.warn(`Failed to navigate to next page: ${err}`);
    return false;
  }
}

import Steel from "steel-sdk";
import puppeteer, { Browser, Page } from "puppeteer-core";

const STEEL_API_KEY = process.env.STEEL_API_KEY || "";

let steelClient: Steel | null = null;

function getSteelClient(): Steel {
  if (!steelClient) {
    steelClient = new Steel({ steelAPIKey: STEEL_API_KEY });
  }
  return steelClient;
}

export interface SteelSession {
  session: Awaited<ReturnType<Steel["sessions"]["create"]>>;
  browser: Browser;
  page: Page;
}

export async function createSteelSession(): Promise<SteelSession> {
  const client = getSteelClient();
  const session = await client.sessions.create({
    useProxy: true,
    solveCaptcha: true,
  });

  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://connect.steel.dev?apiKey=${STEEL_API_KEY}&sessionId=${session.id}`,
  });

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  await page.setViewport({ width: 1440, height: 900 });

  return { session, browser, page };
}

export async function releaseSteelSession(s: SteelSession): Promise<void> {
  const client = getSteelClient();
  try {
    await s.browser.disconnect();
  } catch {}
  try {
    await client.sessions.release(s.session.id);
  } catch {}
}

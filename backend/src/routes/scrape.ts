import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { startScrapeJob, getJob } from "../scraper/orchestrator";

export const scrapeRouter = Router();

/** POST /api/scrape — Start a new scraping job */
scrapeRouter.post("/", async (req: Request, res: Response) => {
  const { searchUrl } = req.body;
  if (!searchUrl || typeof searchUrl !== "string") {
    res.status(400).json({ error: "searchUrl is required" });
    return;
  }

  const jobId = uuidv4();
  await startScrapeJob(jobId, searchUrl);

  res.json({ jobId });
});

/** GET /api/scrape/:id — Get job status */
scrapeRouter.get("/:id", (req: Request<{ id: string }>, res: Response) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json({
    id: job.id,
    status: job.status,
    scraped: job.schema.rowCount,
    columns: job.schema.getColumns(),
  });
});

/** GET /api/scrape/:id/logs — SSE stream of live logs */
scrapeRouter.get("/:id/logs", (req: Request<{ id: string }>, res: Response) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  // Set up SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  const unsubscribe = job.logger.subscribe((entry) => {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  });

  // If job is already done, send a terminal event after history replay
  if (job.status !== "running") {
    setTimeout(() => {
      res.write(
        `data: ${JSON.stringify({ type: "done", status: job.status })}\n\n`
      );
      res.end();
    }, 500);
    return;
  }

  // Watch for job completion
  const interval = setInterval(() => {
    if (job.status !== "running") {
      res.write(
        `data: ${JSON.stringify({ type: "done", status: job.status })}\n\n`
      );
      clearInterval(interval);
      unsubscribe();
      res.end();
    }
  }, 1000);

  // Clean up on client disconnect
  req.on("close", () => {
    clearInterval(interval);
    unsubscribe();
  });
});

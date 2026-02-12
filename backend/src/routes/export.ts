import { Router, Request, Response } from "express";
import { getJob } from "../scraper/orchestrator";
import { exportToParquet } from "../export/parquet";
import fs from "fs";

export const exportRouter = Router();

/** GET /api/export/:id/parquet — Download dataset as Parquet */
exportRouter.get("/:id/parquet", async (req: Request<{ id: string }>, res: Response) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  if (job.schema.rowCount === 0) {
    res.status(400).json({ error: "No data to export" });
    return;
  }

  try {
    const filePath = await exportToParquet(job.schema, job.id);

    res.download(filePath, `zillow-listings-${job.id}.parquet`, (err) => {
      // Clean up temp file
      try {
        fs.unlinkSync(filePath);
      } catch {}
      if (err) {
        console.error("Download error:", err);
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

/** GET /api/export/:id/json — Download dataset as JSON */
exportRouter.get("/:id/json", (req: Request<{ id: string }>, res: Response) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  if (job.schema.rowCount === 0) {
    res.status(400).json({ error: "No data to export" });
    return;
  }

  const data = job.schema.getNormalizedRows();
  res.setHeader("Content-Disposition", `attachment; filename="zillow-listings-${job.id}.json"`);
  res.json(data);
});

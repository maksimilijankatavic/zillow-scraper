import "dotenv/config";
import express from "express";
import cors from "cors";
import { autocompleteRouter } from "./routes/autocomplete";
import { scrapeRouter } from "./routes/scrape";
import { exportRouter } from "./routes/export";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

app.use(cors({ origin: true }));
app.use(express.json());

app.use("/api/autocomplete", autocompleteRouter);
app.use("/api/scrape", scrapeRouter);
app.use("/api/export", exportRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

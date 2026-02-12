const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export interface Suggestion {
  text: string;
  url: string | null;
  type: string;
}

export async function fetchAutocomplete(
  query: string
): Promise<Suggestion[]> {
  const res = await fetch(
    `${BACKEND}/api/autocomplete?q=${encodeURIComponent(query)}`
  );
  if (!res.ok) throw new Error("Autocomplete request failed");
  const data = await res.json();
  return data.suggestions ?? [];
}

export async function startScrape(searchUrl: string): Promise<string> {
  const res = await fetch(`${BACKEND}/api/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ searchUrl }),
  });
  if (!res.ok) throw new Error("Failed to start scrape");
  const data = await res.json();
  return data.jobId;
}

export interface JobStatus {
  id: string;
  status: "running" | "completed" | "error";
  scraped: number;
  columns: string[];
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${BACKEND}/api/scrape/${jobId}`);
  if (!res.ok) throw new Error("Failed to get job status");
  return res.json();
}

export function getLogsUrl(jobId: string): string {
  return `${BACKEND}/api/scrape/${jobId}/logs`;
}

export function getExportParquetUrl(jobId: string): string {
  return `${BACKEND}/api/export/${jobId}/parquet`;
}

export function getExportJsonUrl(jobId: string): string {
  return `${BACKEND}/api/export/${jobId}/json`;
}

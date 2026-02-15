"use client";

import { getExportParquetUrl, getExportJsonUrl } from "@/lib/api";

interface ExportPanelProps {
  jobId: string;
}

export default function ExportPanel({ jobId }: ExportPanelProps) {
  return (
    <div className="w-full max-w-4xl mt-6">
      <div className="nb-card p-6">
        <h3 className="text-lg font-black mb-1">
          Export Dataset
        </h3>
        <p className="text-sm font-semibold mb-4 opacity-60">
          Download the scraped listings with all dynamically discovered columns.
        </p>
        <div className="flex gap-4">
          <a
            href={getExportParquetUrl(jobId)}
            download
            className="nb-btn nb-btn-primary"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download Parquet
          </a>
          <a
            href={getExportJsonUrl(jobId)}
            download
            className="nb-btn nb-btn-secondary"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download JSON
          </a>
        </div>
      </div>
    </div>
  );
}

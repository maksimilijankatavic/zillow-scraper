"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import LogViewer from "@/components/LogViewer";
import ExportPanel from "@/components/ExportPanel";

export default function ScrapePage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const [isDone, setIsDone] = useState(false);

  const handleDone = useCallback(() => {
    setIsDone(true);
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      {/* Header */}
      <div className="w-full max-w-4xl mb-8">
        <button
          onClick={() => router.push("/")}
          className="nb-btn nb-btn-secondary text-sm mb-4 py-2 px-3"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to search
        </button>
        <h1 className="text-3xl font-black">
          Scraping Job
        </h1>
        <p className="text-sm mt-1 font-mono font-bold opacity-50">
          {jobId}
        </p>
      </div>

      {/* Live Logs */}
      <LogViewer jobId={jobId} onDone={handleDone} />

      {/* Export Panel - shown when done */}
      {isDone && <ExportPanel jobId={jobId} />}
    </main>
  );
}

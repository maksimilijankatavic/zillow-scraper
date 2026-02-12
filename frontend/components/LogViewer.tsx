"use client";

import { useEffect, useRef, useState } from "react";
import { getLogsUrl } from "@/lib/api";

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
  scraped?: number;
  total?: number;
  type?: string;
}

interface LogViewerProps {
  jobId: string;
  onDone: () => void;
}

const LEVEL_STYLES: Record<string, string> = {
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
  success: "text-green-400",
};

const LEVEL_LABELS: Record<string, string> = {
  info: "INFO",
  warn: "WARN",
  error: "ERR ",
  success: " OK ",
};

export default function LogViewer({ jobId, onDone }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scraped, setScraped] = useState(0);
  const [total] = useState(100);
  const [isDone, setIsDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    const eventSource = new EventSource(getLogsUrl(jobId));

    eventSource.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data);

        if (entry.type === "done") {
          setIsDone(true);
          eventSource.close();
          onDone();
          return;
        }

        setLogs((prev) => [...prev, entry]);
        if (typeof entry.scraped === "number") {
          setScraped(entry.scraped);
        }
      } catch {}
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [jobId, onDone]);

  // Auto-scroll
  useEffect(() => {
    if (autoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  function handleScroll() {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
  }

  const progress = Math.min((scraped / total) * 100, 100);

  return (
    <div className="w-full max-w-4xl">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {isDone ? "Scraping complete" : "Scraping in progress..."}
          </span>
          <span className="text-sm font-mono font-bold text-[var(--zillow-blue)]">
            {scraped} / {total}
          </span>
        </div>
        <div className="h-3 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
              background: isDone
                ? "#22c55e"
                : "var(--zillow-blue)",
            }}
          />
        </div>
      </div>

      {/* Log window */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="bg-[#0d1117] rounded-xl border border-[var(--border-color)] p-4 font-mono text-sm h-[500px] overflow-y-auto"
      >
        {logs.length === 0 && (
          <div className="text-[var(--text-secondary)] text-center py-8">
            Waiting for logs...
          </div>
        )}
        {logs.map((entry, i) => {
          const time = new Date(entry.timestamp).toLocaleTimeString();
          const levelClass = LEVEL_STYLES[entry.level] || "text-gray-400";
          const label = LEVEL_LABELS[entry.level] || "LOG ";

          return (
            <div key={i} className="flex gap-3 py-0.5 leading-relaxed">
              <span className="text-gray-600 shrink-0">{time}</span>
              <span className={`${levelClass} shrink-0 font-bold`}>
                [{label}]
              </span>
              <span className="text-gray-300 break-all">{entry.message}</span>
            </div>
          );
        })}
        {isDone && (
          <div className="flex gap-3 py-0.5 leading-relaxed mt-2 border-t border-gray-800 pt-2">
            <span className="text-green-400 font-bold">
              Scraping finished. {scraped} listings collected.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

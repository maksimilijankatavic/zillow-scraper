"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import { Suggestion, startScrape } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(suggestion: Suggestion) {
    setIsStarting(true);
    setError(null);

    try {
      // Build the Zillow search URL from the suggestion
      let searchUrl: string;
      if (suggestion.url) {
        // Use the URL directly from autocomplete if available
        searchUrl = suggestion.url.startsWith("http")
          ? suggestion.url
          : `https://www.zillow.com${suggestion.url}`;
      } else {
        // Fall back to constructing a search URL
        const slug = suggestion.text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        searchUrl = `https://www.zillow.com/homes/${slug}_rb/`;
      }

      const jobId = await startScrape(searchUrl);
      router.push(`/scrape/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scraping");
      setIsStarting(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold mb-3 tracking-tight text-[var(--text-primary)]">
          Zillow Scraper
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-lg mx-auto">
          Search for any location. Get up to 100 listings with full property
          data, exported to Parquet.
        </p>
        <p className="text-sm text-[var(--text-secondary)] mt-2 opacity-70">
          Powered by Steel.dev browser automation
        </p>
      </div>

      {/* Search */}
      <SearchBar onSelect={handleSelect} />

      {/* Loading state */}
      {isStarting && (
        <div className="mt-6 flex items-center gap-3 text-[var(--text-secondary)]">
          <div className="w-5 h-5 border-2 border-[var(--zillow-blue)] border-t-transparent rounded-full animate-spin" />
          <span>Starting scraping session...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm max-w-md">
          {error}
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 max-w-2xl w-full">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5">
          <div className="text-2xl font-bold text-[var(--zillow-blue)]">100</div>
          <div className="text-sm text-[var(--text-secondary)] mt-1">
            Max listings per search
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5">
          <div className="text-2xl font-bold text-[var(--zillow-blue)]">
            Parallel
          </div>
          <div className="text-sm text-[var(--text-secondary)] mt-1">
            Concurrent browser sessions
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5">
          <div className="text-2xl font-bold text-[var(--zillow-blue)]">
            Parquet
          </div>
          <div className="text-sm text-[var(--text-secondary)] mt-1">
            Export with dynamic schema
          </div>
        </div>
      </div>
    </main>
  );
}

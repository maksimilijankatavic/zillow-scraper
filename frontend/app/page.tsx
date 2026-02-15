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
      let searchUrl: string;
      if (suggestion.url) {
        searchUrl = suggestion.url.startsWith("http")
          ? suggestion.url
          : `https://www.zillow.com${suggestion.url}`;
      } else {
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
        <h1 className="text-5xl font-black mb-3 tracking-tight">
          Zillow Scraper
        </h1>
        <p className="text-lg font-medium max-w-lg mx-auto">
          Search for any location. Get up to 100 listings with full property
          data, exported to Parquet.
        </p>
        <p className="text-sm mt-2 opacity-60 font-semibold">
          Powered by Steel.dev browser automation
        </p>
      </div>

      {/* Search */}
      <SearchBar onSelect={handleSelect} />

      {/* Loading state */}
      {isStarting && (
        <div className="mt-6 flex items-center gap-3">
          <div className="w-5 h-5 border-3 border-main border-t-transparent rounded-full animate-spin" />
          <span className="font-bold">Starting scraping session...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 nb-card px-5 py-3 bg-error/20 text-sm font-bold max-w-md">
          {error}
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 max-w-2xl w-full">
        <div className="nb-card p-5 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_black] transition-all">
          <div className="text-3xl font-black text-main-accent">100</div>
          <div className="text-sm font-bold mt-1">
            Max listings per search
          </div>
        </div>
        <div className="nb-card p-5 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_black] transition-all">
          <div className="text-3xl font-black text-main-accent">
            Parallel
          </div>
          <div className="text-sm font-bold mt-1">
            Concurrent browser sessions
          </div>
        </div>
        <div className="nb-card p-5 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_black] transition-all">
          <div className="text-3xl font-black text-main-accent">
            Parquet
          </div>
          <div className="text-sm font-bold mt-1">
            Export with dynamic schema
          </div>
        </div>
      </div>
    </main>
  );
}

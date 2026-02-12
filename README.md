# Zillow Scraper with Steel.dev

Full-stack web application that replicates the Zillow search experience, scrapes listing data using Steel.dev browser automation, and exports results to Parquet format.

## Architecture

```
frontend/   → Next.js app (Vercel-deployable)
backend/    → Express.js scraping service
```

**Frontend** provides the search UI with real-time autocomplete, live scraping logs via SSE, and export downloads.

**Backend** orchestrates Steel.dev browser sessions for autocomplete mirroring, concurrent listing scraping (up to 100 listings), dynamic schema management, and Parquet export.

## Setup

### Prerequisites

- Node.js 18+
- Steel.dev API key (with proxy + captcha solving)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # Add your STEEL_API_KEY
npm run dev
```

Runs on `http://localhost:3001`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Runs on `http://localhost:3000`. Proxies API calls to the backend via Next.js rewrites.

## How It Works

1. **Search**: Type a location — autocomplete suggestions come from a Steel browser session mirroring Zillow's search.
2. **Scrape**: Select a result to start scraping. The orchestrator opens search results, extracts listing URLs, and spawns concurrent Steel sessions (one per listing).
3. **Monitor**: Watch real-time logs stream into the UI with progress tracking.
4. **Export**: Download results as Parquet or JSON once scraping completes.

## Data Extracted Per Listing

- Link, Address, Price
- Zestimate, Estimated Sales Range, Rent Zestimate
- All Facts & Features fields (dynamically discovered)
- Price History `[[date, event, price], ...]`
- Public Tax History `[[year, taxes, assessment], ...]`

## Key Design Decisions

- **Global 100-listing limit**: Enforced in the orchestrator with early termination
- **Dynamic schema**: New columns auto-added as they appear; previous rows get null
- **Concurrent scraping**: All listings on a page scraped in parallel via separate Steel sessions
- **SSE for logs**: Real-time streaming from backend to frontend

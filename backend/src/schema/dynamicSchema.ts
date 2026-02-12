export interface ListingData {
  [key: string]: unknown;
}

/**
 * Manages a dynamically evolving schema across all scraped listings.
 * New columns are added as they're discovered. Previous rows get null for missing columns.
 */
export class DynamicSchema {
  private columns: Set<string> = new Set();
  private rows: ListingData[] = [];

  /** Add a scraped listing. New keys automatically extend the schema. */
  addRow(data: ListingData): void {
    for (const key of Object.keys(data)) {
      this.columns.add(key);
    }
    this.rows.push(data);
  }

  /** Get all column names in insertion order. */
  getColumns(): string[] {
    return [...this.columns];
  }

  /** Get all rows normalized so every row has every column (null for missing). */
  getNormalizedRows(): ListingData[] {
    const cols = this.getColumns();
    return this.rows.map((row) => {
      const normalized: ListingData = {};
      for (const col of cols) {
        normalized[col] = row[col] ?? null;
      }
      return normalized;
    });
  }

  get rowCount(): number {
    return this.rows.length;
  }
}

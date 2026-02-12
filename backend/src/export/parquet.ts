import { ParquetWriter, ParquetSchema } from "@dsnp/parquetjs";
import path from "path";
import os from "os";
import { DynamicSchema, ListingData } from "../schema/dynamicSchema";

/**
 * Build a Parquet schema from the dynamic columns.
 * All fields are optional UTF8 strings — array fields (price_history, tax_history)
 * are serialized as JSON strings.
 */
function buildParquetSchema(columns: string[]): ParquetSchema {
  const fields: Record<string, { type: "UTF8"; optional: true }> = {};
  for (const col of columns) {
    fields[col] = { type: "UTF8" as const, optional: true as const };
  }
  return new ParquetSchema(fields);
}

/** Serialize a value for Parquet storage. Arrays/objects become JSON strings. */
function serialize(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Write the dynamic schema dataset to a Parquet file.
 * Returns the absolute path to the written file.
 */
export async function exportToParquet(
  schema: DynamicSchema,
  jobId: string
): Promise<string> {
  const columns = schema.getColumns();
  if (columns.length === 0) {
    throw new Error("No data to export");
  }

  const parquetSchema = buildParquetSchema(columns);
  const filePath = path.join(os.tmpdir(), `zillow-${jobId}.parquet`);

  const writer = await ParquetWriter.openFile(parquetSchema, filePath);

  for (const row of schema.getNormalizedRows()) {
    const record: Record<string, string | null> = {};
    for (const col of columns) {
      record[col] = serialize(row[col]);
    }
    await writer.appendRow(record);
  }

  await writer.close();
  return filePath;
}

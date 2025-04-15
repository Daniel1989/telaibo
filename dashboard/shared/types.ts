/**
 * @jsxImportSource https://esm.sh/react@18.2.0
 */

export interface Memory {
    id: string; // UUID
    date: string; // ISO 8601 date string or similar
    text: string;
    createdBy?: string | null; // Optional: Who/what created the memory
    createdDate?: number | null; // Optional: Unix timestamp (integer)
    tags?: string | null; // Optional: Comma-separated string or JSON
  }
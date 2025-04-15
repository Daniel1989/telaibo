// Script to populate random IDs for existing memory rows
// Run this script manually to generate IDs for rows that don't have them

import { nanoid } from "https://esm.sh/nanoid@5.0.5";

export default async function populateMemoryIds() {
  try {
    // Import SQLite module
    const { sqlite } = await import("https://esm.town/v/stevekrouse/sqlite");

    // Get all rows without an ID
    const rowsWithoutId = await sqlite.execute(`
      SELECT rowid FROM memories WHERE id IS NULL OR id = ''
    `);

    console.log(
      `Found ${rowsWithoutId.rows.length} rows without IDs. Generating IDs...`
    );

    // Update each row with a unique ID
    let updatedCount = 0;
    for (const row of rowsWithoutId.rows) {
      const id = nanoid(10); // Generate a 10-character ID
      await sqlite.execute({
        sql: `UPDATE memories SET id = :id, createdDate = :timestamp WHERE rowid = :rowid`,
        args: {
          id,
          timestamp: Date.now(),
          rowid: row.rowid,
        },
      });
      updatedCount++;
    }

    console.log(`Successfully updated ${updatedCount} rows with new IDs.`);
    return `Successfully updated ${updatedCount} rows with new IDs.`;
  } catch (error) {
    console.error("Error populating memory IDs:", error);
    throw error;
  }
}

// Uncomment to run directly
// populateMemoryIds();
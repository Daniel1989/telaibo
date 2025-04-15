// Script to migrate the memories table in SQLite
// Run this script manually to add new columns to the memories table

export default async function migrateMemoriesDb() {
    try {
      // Import SQLite module
      const { sqlite } = await import("https://esm.town/v/stevekrouse/sqlite");
  
      // First, backup the current table contents
      const backup = await sqlite.execute(`SELECT * FROM memories`);
      console.log("Backup of memories table (JSON format):");
      console.log(JSON.stringify(backup.rows, null, 2));
  
      // Create a new table with the updated schema
      await sqlite.execute(`
        CREATE TABLE IF NOT EXISTS memories_new (
          id TEXT,
          date TEXT,
          text TEXT,
          createdBy TEXT,
          createdDate INTEGER,
          tags TEXT
        )
      `);
  
      // Copy data from old table to new table
      await sqlite.execute(`
        INSERT INTO memories_new (date, text)
        SELECT date, text FROM memories
      `);
  
      // Drop the old table
      await sqlite.execute(`DROP TABLE memories`);
  
      // Rename the new table to the original name
      await sqlite.execute(`ALTER TABLE memories_new RENAME TO memories`);
  
      // Create an index on id for faster lookups
      await sqlite.execute(`
        CREATE INDEX IF NOT EXISTS idx_memories_id ON memories(id)
      `);
  
      return "Memories table migrated successfully with new columns.";
    } catch (error) {
      console.error("Error migrating memories table:", error);
      throw error;
    }
  }
  
  migrateMemoriesDb();
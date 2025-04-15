// Script to populate createdBy for existing memory rows
// Run this script manually to set createdBy based on memory content

export default async function populateCreatedBy() {
    try {
      // Import SQLite module
      const { sqlite } = await import("https://esm.town/v/stevekrouse/sqlite");
  
      // Get all rows without a createdBy
      const rowsWithoutCreatedBy = await sqlite.execute(`
        SELECT rowid, text FROM memories WHERE createdBy IS NULL OR createdBy = ''
      `);
  
      console.log(
        `Found ${rowsWithoutCreatedBy.rows.length} rows without createdBy. Populating...`
      );
  
      // Update each row with the appropriate createdBy
      let updatedCount = 0;
      for (const row of rowsWithoutCreatedBy.rows) {
        let createdBy = "chat"; // Default value
        const text = row.text?.toLowerCase() || "";
  
        // Determine createdBy based on text content
        if (text.includes("weather")) {
          createdBy = "weather";
        } else if (text.includes("expecting")) {
          createdBy = "usps";
        }
  
        // Set tags based on createdBy
        let tags = "";
        if (createdBy === "weather") {
          tags = "weather";
        } else if (createdBy === "usps") {
          tags = "mail";
        }
  
        await sqlite.execute({
          sql: `UPDATE memories
                SET createdBy = :createdBy,
                    tags = :tags,
                    createdDate = COALESCE(createdDate, :timestamp)
                WHERE rowid = :rowid`,
          args: {
            createdBy,
            tags,
            timestamp: Date.now(),
            rowid: row.rowid,
          },
        });
        updatedCount++;
      }
  
      console.log(
        `Successfully updated ${updatedCount} rows with createdBy values.`
      );
      return `Successfully updated ${updatedCount} rows with createdBy values.`;
    } catch (error) {
      console.error("Error populating createdBy:", error);
      throw error;
    }
  }
  
  // Uncomment to run directly
  // populateCreatedBy();
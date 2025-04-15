// Script to set up the telegram_chats table in SQLite
// Run this script manually to create the database table

export default async function setupTelegramChatDb() {
    try {
      // Import SQLite module
      const { sqlite } = await import("https://esm.town/v/stevekrouse/sqlite");
  
      // Create the telegram_chats table
      await sqlite.execute(`
        CREATE TABLE IF NOT EXISTS telegram_chats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id INTEGER NOT NULL,
          sender_id TEXT NOT NULL,
          sender_name TEXT NOT NULL,
          message TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          is_bot BOOLEAN NOT NULL
        )
      `);
  
      // Create an index on chat_id for faster lookups
      await sqlite.execute(`
        CREATE INDEX IF NOT EXISTS idx_telegram_chats_chat_id ON telegram_chats(chat_id)
      `);
  
      return "Telegram chat database table created successfully.";
    } catch (error) {
      console.error("Error setting up telegram_chats table:", error);
      throw error;
    }
  }
  
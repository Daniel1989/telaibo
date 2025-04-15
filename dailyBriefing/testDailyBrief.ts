// Send a test of the daily brief to a test chat id

import { sendDailyBriefing } from "./sendDailyBrief.ts";
import { DateTime } from "https://esm.sh/luxon@3.4.4";

export async function testDailyBrief() {
  try {
    const testChatId = Deno.env.get("TEST_TELEGRAM_CHAT_ID");
    if (!testChatId) {
      console.error("TEST_TELEGRAM_CHAT_ID is not configured.");
      return;
    }

    console.log("Sending test daily briefing for tomorrow...");
    const result = await sendDailyBriefing(
      testChatId,
      DateTime.now()
        .setZone("America/New_York")
        .startOf("day")
        .plus({ days: 1 })
    );
    return result;
  } catch (error) {
    console.error("Error sending test daily briefing:", error);
    throw error;
  }
}

// Export as default for direct execution
testDailyBrief();
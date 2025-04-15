import { sendDailyBriefing } from "./sendDailyBrief.ts";

export async function cronDailyBrief() {
  try {
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
    if (!chatId) {
      console.error("TELEGRAM_CHAT_ID is not configured.");
      return;
    }

    console.log("Sending scheduled daily briefing...");
    const result = await sendDailyBriefing(chatId);
    return result;
  } catch (error) {
    console.error("Error sending scheduled daily briefing:", error);
    throw error;
  }
}

// Export as default for cron scheduling
export default cronDailyBrief;
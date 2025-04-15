import { Bot } from "https://deno.land/x/grammy@v1.35.0/mod.ts";
import { DateTime } from "https://esm.sh/luxon@3.4.4";
import Anthropic from "npm:@anthropic-ai/sdk@0.24.3";
import { backstory } from "../backstory.ts";
import {
  BOT_SENDER_ID,
  BOT_SENDER_NAME,
  storeChatMessage,
} from "../importers/handleTelegramMessage.ts";
import {
  formatMemoriesForPrompt,
  getRelevantMemories,
} from "../memoryUtils.ts";

async function generateBriefingContent(anthropic, memories, today, isSunday) {
  try {
    const weekdaysHelp = generateWeekDays(today);
    // Create system prompt
    const systemPrompt = `${backstory}`;

    // Create user message
    const userMessage = {
      role: "user",
      content: `Today it is your duty to provide a daily briefing summarizing important information for the day. The briefing should have the following sections:

Begin with a formal morning greeting, maintaining professional decorum. Try to mix up the greetings, for example mention the season or the weather.

*Today*

Note any reminders about today's affairs.
Provide a summary of today's meteorological conditions.
Detail the day's postal correspondence, highlighting any significant items such as important documents, personal letters, or parcels. Advertisements need not be mentioned. If there is no mail, this section may be omitted.

*Looking Ahead*

Offer a brief overview of forthcoming engagements and tasks for the remainder of the week, with particular attention to tomorrow's schedule.
Should there be noteworthy meteorological conditions anticipated later in the week (such as precipitation or significant temperature variations), these should be mentioned. If the weather is unremarkable, this need not be addressed.
One concise paragraph, 2-3 sentences maximum, without bullet points or subsections.

*Daily fact*

Include the fun fact for today from the memories. This will be labeled with "fun fact:" in the text field.
If no fun fact is available for today, you may omit this section.

Sign off with a formal greeting.

Use the following memories to fill in the information for your briefing:

${formatMemoriesForPrompt(memories)}

Response guidelines:

Always follow these rules:
- Use Telegram-friendly markdown format (supports *bold*, _italic_, [links](http://example.com))). Do not use markdown headings like ## as they are not supported in Telegram messages.
- Make the briefing easily skimmable by using clear sections. Use bolded text to begin each section, eg *Today*
- Use emojis to help reinforce the content visually. Use emojis for specific concepts like sun/rainy weather, paper forms for a logistical todo, etc. Don't use emojis for general concepts like "today"

- Address the message to "Sir and Madam".
- Maintain a formal and professional tone throughout.
- Use phrases characteristic of Stevens' speech patterns, such as:
  - "I should say..."
  - "I would venture..."
  - "If I may be so bold..."
  - "It would appear that..."
  - "One might observe..."
  - "I trust you will find..."
  - "I would be remiss not to mention..."
- Avoid contractions (use "do not" instead of "don't")
- Express opinions tentatively and with great deference
- Use British English spelling and terminology
- Keep the content concise but informative, maintaining the highest standards of professional communication
- You should reference upcoming days as "today", "tomorrow", "Thursday", etc. rather than using dates. Here's a guide:
${weekdaysHelp}`,
    };

    console.log("Sending prompt to Anthropic...", userMessage);

    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-latest",
      max_tokens: 30000,
      system: systemPrompt,
      thinking: {
        type: "enabled",
        budget_tokens: 24000,
      },
      messages: [userMessage],
    });

    const text = response.content.find((block) => block.type === "text").text;

    return text;
  } catch (error) {
    console.error("Briefing generation error:", error);
    throw error;
  }
}

export async function sendDailyBriefing(chatId?: string, today?: DateTime) {
  // Get API keys from environment
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const telegramToken = Deno.env.get("TELEGRAM_TOKEN");

  // If no chatId is provided, try to get it from environment variables
  if (!chatId) {
    chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  }

  if (!apiKey) {
    console.error("Anthropic API key is not configured.");
    return;
  }

  if (!telegramToken) {
    console.error("TELEGRAM_TOKEN is not configured.");
    return;
  }

  if (!chatId) {
    console.error("No chat ID provided or found in environment variables.");
    return;
  }

  // Initialize Anthropic client
  const anthropic = new Anthropic({ apiKey });

  // Initialize Telegram bot
  const bot = new Bot(telegramToken);

  // Use provided date or get today's date in US Eastern Time
  if (!today) {
    today = DateTime.now().setZone("America/New_York").startOf("day");
  }

  // Get the date of the last Sunday
  const lastSunday = today.startOf("week").minus({ days: 1 });

  // Fetch relevant memories using the utility function
  const memories = await getRelevantMemories();

  console.log(memories);

  // Check if today is Sunday (1 is Sunday in Luxon)
  const isSunday = today.weekday === 7;

  // Generate briefing content
  const content = await generateBriefingContent(
    anthropic,
    memories,
    today,
    isSunday
  );

  console.log("content", content);

  console.log("Sending Telegram message...");

  // Format message for Telegram
  // Telegram supports Markdown V2, but it's more restrictive than regular Markdown
  // For simplicity, we'll use the content as is, which should work with basic formatting

  // First send the title as a separate message

  // disabled title for now, it seemes unnecessary...
  // await bot.api.sendMessage(chatId, `*${title}*`, { parse_mode: "Markdown" });

  // Then send the main content
  // Telegram has a 4096 character limit per message, so we might need to split it
  const MAX_LENGTH = 4000; // A bit less than 4096 to be safe

  if (content.length <= MAX_LENGTH) {
    await bot.api.sendMessage(chatId, content, { parse_mode: "Markdown" });
    // Store the briefing in chat history
    await storeChatMessage(
      chatId,
      BOT_SENDER_ID,
      BOT_SENDER_NAME,
      content,
      true
    );
  } else {
    // Split the content into chunks
    const chunks = [];
    let currentChunk = "";

    for (const line of content.split("\n")) {
      if ((currentChunk + line + "\n").length > MAX_LENGTH) {
        chunks.push(currentChunk);
        currentChunk = line + "\n";
      } else {
        currentChunk += line + "\n";
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    // Send each chunk as a separate message and store in chat history
    for (const chunk of chunks) {
      await bot.api.sendMessage(chatId, chunk, { parse_mode: "Markdown" });
      // Store each chunk in chat history
      await storeChatMessage(
        chatId,
        BOT_SENDER_ID,
        BOT_SENDER_NAME,
        chunk,
        true
      );
      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log("Daily briefing sent successfully via Telegram.");
  return "Daily briefing sent successfully.";
}

function generateWeekDays(today) {
  let output = [];

  // Add today
  output.push(`* Today: ${today.toFormat("EEEE, MMMM d")}`);

  // Add tomorrow
  const tomorrow = today.plus({ days: 1 });
  output.push(`* Tomorrow: ${tomorrow.toFormat("EEEE, MMMM d")}`);

  // Add rest of the week
  for (let i = 2; i < 7; i++) {
    const futureDay = today.plus({ days: i });
    output.push(`* ${futureDay.toFormat("EEEE, MMMM d")}`);
  }

  return output.join("\n");
}

// Example usage:
// const weekDays = generateWeekDays();
// console.log(weekDays);

// Export a function that calls sendDailyBriefing with no parameters
// This maintains backward compatibility with existing cron jobs
export default async function (overrideToday?: DateTime) {
  return await sendDailyBriefing(undefined, overrideToday);
}

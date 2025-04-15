import {
    Bot,
    webhookCallback,
  } from "https://deno.land/x/grammy@v1.35.0/mod.ts";
  import { DateTime } from "https://esm.sh/luxon@3.4.4";
  import Anthropic from "npm:@anthropic-ai/sdk@0.24.3";
  import { backstory } from "../backstory.ts";
  import {
    formatMemoriesForPrompt,
    getRelevantMemories,
  } from "../memoryUtils.ts";
  
  // Initialize the bot
  if (!Deno.env.get("TELEGRAM_TOKEN")) {
    throw new Error("TELEGRAM_TOKEN is not set");
  }
  const bot = new Bot(Deno.env.get("TELEGRAM_TOKEN")!);
  
  // Use part of the TELEGRAM_TOKEN itself as the secret_token
  const SECRET_TOKEN = Deno.env.get("TELEGRAM_TOKEN")!.split(":")[1];
  const handleUpdate = webhookCallback(
    bot,
    "std/http",
    undefined,
    undefined,
    SECRET_TOKEN
  );
  
  let isEndpointSet = false;
  
  // Special ID for the bot's own messages
  export const BOT_SENDER_ID = "mr_stevens_bot";
  export const BOT_SENDER_NAME = "Mr. Stevens";
  
  /**
   * Store a chat message in the database
   */
  export async function storeChatMessage(
    chatId,
    senderId,
    senderName,
    message,
    isBot = false
  ) {
    try {
      const { sqlite } = await import("https://esm.town/v/stevekrouse/sqlite");
      const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
  
      await sqlite.execute({
        sql: `INSERT INTO telegram_chats (chat_id, sender_id, sender_name, message, timestamp, is_bot)
              VALUES (:chat_id, :sender_id, :sender_name, :message, :timestamp, :is_bot)`,
        args: {
          chat_id: chatId,
          sender_id: senderId,
          sender_name: senderName,
          message: message,
          timestamp: timestamp,
          is_bot: isBot ? 1 : 0,
        },
      });
      return true;
    } catch (error) {
      console.error("Error storing chat message:", error);
      return false;
    }
  }
  
  /**
   * Retrieve chat history for a specific chat
   */
  export async function getChatHistory(chatId, limit = 50) {
    try {
      const { sqlite } = await import("https://esm.town/v/stevekrouse/sqlite");
  
      const result = await sqlite.execute({
        sql: `SELECT * FROM telegram_chats
              WHERE chat_id = :chat_id
              ORDER BY timestamp ASC
              LIMIT :limit`,
        args: {
          chat_id: chatId,
          limit: limit,
        },
      });
  
      return result.rows || [];
    } catch (error) {
      console.error("Error retrieving chat history:", error);
      return [];
    }
  }
  
  /**
   * Format chat history for Anthropic API
   */
  function formatChatHistoryForAI(history) {
    const messages = [];
  
    for (const msg of history) {
      if (msg.is_bot) {
        messages.push({
          role: "assistant",
          content: msg.message,
        });
      } else {
        // Format user message with sender name
        messages.push({
          role: "user",
          content: `${msg.sender_name} says: ${msg.message}`,
        });
      }
    }
  
    return messages;
  }
  
  /**
   * Analyze a Telegram message and extract memories from it
   */
  async function analyzeMessageContent(
    anthropic,
    username,
    messageText,
    chatHistory = []
  ) {
    try {
      // Get relevant memories
      const memories = await getRelevantMemories();
      const memoriesText = formatMemoriesForPrompt(memories);
  
      // Prepare system prompt with all instructions and memories
      const systemPrompt = `${backstory}
  
  Your job is to read this Telegram message from your employer and respond in a natural, butler-like way, noting any important information that should be remembered for future reference.
  
  You have access to the following stored memories:
  
  ${memoriesText}
  
  If this appears to be a new client or the conversation is in an early stage, you should conduct an intake interview to gather essential background information. First ask the client if now is a good time to ask them some questions.
  
  Ask about the following topics in a conversational way (not all at once, but continuing the interview naturally based on their responses):
  
  Initial Information:
  - Who are the family members living in the home and their ages?
  - Names of close family members and their relationships to the client?
  
  Daily Life:
  - Which grocery stores and local restaurants they frequent?
  - Family members' food preferences and any dietary restrictions?
  - Typical working hours and recurring commitments?
  - Important dates (birthdays, anniversaries, holidays)?
  - Monthly bills and subscriptions that need tracking?
  - Emergency contacts and regular service providers?
  - Current health goals and any medication reminders needed?
  
  Your goal is to collect this information naturally through conversation and store it as memories (as undated memories). Once you've gathered sufficient background information, you can conclude the intake process and transition to normal reactive chat.
  
  If the conversation is already past the intake stage, then analyze the message content and think about which memories might be worth creating based on the information provided.
  
  You should respond in a natural conversational way. You have three options for managing memories:
  
  1. CREATE memories: Include them in <createMemories> tags in JSON format.
  2. EDIT memories: Include them in <editMemories> tags in JSON format (must include memory ID).
  3. DELETE memories: Include them in <deleteMemories> tags in JSON format (just include memory IDs).
  
  Example response WITHOUT memory modification:
  "Very good, sir. I shall make a note of that."
  
  Example response WITH memory creation:
  "I've noted that you prefer Earl Grey tea in the morning, sir.
  
  <createMemories>
  [{ "text": "Client prefers Earl Grey tea in the morning.", "date": null }]
  </createMemories>"
  
  Example response WITH memory editing:
  "I've updated your birthday in my records, sir.
  
  <editMemories>
  [{ "id": "abc123", "text": "Client's birthday is on April 15th.", "date": "2024-04-15" }]
  </editMemories>"
  
  Example response WITH memory deletion:
  "I've removed that note from my records as requested, sir.
  
  <deleteMemories>
  ["abc123"]
  </deleteMemories>"
  
  Important guidelines for memory management:
  1. For new memories, set a date for each memory whenever possible.
  2. The date should be the actual date of the event. You don't need to set reminder dates in advance.
  3. Keep the memory text concise: ideally one short sentence, but include all important details.
  4. Extract any dates mentioned and convert them to ISO format. If the year isn't mentioned, assume the current year.
  5. If no date is relevant to the memory, set "date" to null.
  6. For editing or deleting memories, you MUST include the correct memory ID from the displayed memories. Each memory is displayed with its ID in the format "[ID: xyz123]".
  7. If no memories need to be managed, simply respond naturally WITHOUT including any memory tags.
  8. When a user asks to delete a memory, you must find its ID from the memory list above and include that ID in the deleteMemories tag.
  9. Do not create duplicate memories. If a memory already exists, do not record the same information again.
  
  Your response style:
  - Use a brief, natural-sounding tone characteristic of a personal assistant
  - Be slightly dignified but sound modern, not too stuffy or old-fashioned
  - Keep responses brief (1-2 sentences)
  - Vary your responses to avoid sounding robotic
  - Be polite and deferential
  - Avoid contractions (use "do not" instead of "don't")
  
  Today's date is ${DateTime.now()
        .setZone("America/New_York")
        .toFormat("yyyy-MM-dd")}`;
  
      // Prepare formatted chat history
      const formattedHistory =
        chatHistory.length > 0 ? formatChatHistoryForAI(chatHistory) : [];
  
      console.log({ systemPrompt, formattedHistory });
  
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 4196,
        system: systemPrompt,
        messages: formattedHistory,
      });
  
      // Get the text response
      const responseText = response.content[0].text;
  
      console.log({ responseText });
  
      // Parse the response, extracting memories if present
      try {
        // Check if there are memories to create, edit, or delete
        const createMemoryMatch = responseText.match(
          /<createMemories>([\s\S]*?)<\/createMemories>/
        );
        const editMemoryMatch = responseText.match(
          /<editMemories>([\s\S]*?)<\/editMemories>/
        );
        const deleteMemoryMatch = responseText.match(
          /<deleteMemories>([\s\S]*?)<\/deleteMemories>/
        );
  
        let cleanedResponse = responseText;
        let memories = [];
        let editMemories = [];
        let deleteMemories = [];
  
        // Parse created memories
        if (createMemoryMatch) {
          cleanedResponse = cleanedResponse
            .replace(/<createMemories>[\s\S]*?<\/createMemories>/, "")
            .trim();
  
          try {
            memories = JSON.parse(createMemoryMatch[1]);
          } catch (e) {
            console.error("Error parsing created memories JSON:", e);
          }
        }
  
        // Parse edited memories
        if (editMemoryMatch) {
          cleanedResponse = cleanedResponse
            .replace(/<editMemories>[\s\S]*?<\/editMemories>/, "")
            .trim();
  
          try {
            editMemories = JSON.parse(editMemoryMatch[1]);
          } catch (e) {
            console.error("Error parsing edited memories JSON:", e);
          }
        }
  
        // Parse deleted memories
        if (deleteMemoryMatch) {
          cleanedResponse = cleanedResponse
            .replace(/<deleteMemories>[\s\S]*?<\/deleteMemories>/, "")
            .trim();
  
          try {
            deleteMemories = JSON.parse(deleteMemoryMatch[1]);
          } catch (e) {
            console.error("Error parsing deleted memories JSON:", e);
          }
        }
  
        // Handle any trailing/leading newlines that might be left after removing the tags
        cleanedResponse = cleanedResponse.replace(/\n{3,}/g, "\n\n"); // Replace 3+ consecutive newlines with 2
  
        return {
          memories: memories,
          editMemories: editMemories,
          deleteMemories: deleteMemories,
          response: cleanedResponse,
        };
      } catch (error) {
        console.error("Error processing AI response:", error);
        return {
          memories: [],
          editMemories: [],
          deleteMemories: [],
          response:
            responseText ||
            "I apologize, but I'm unable to process your request at the moment.",
        };
      }
    } catch (error) {
      console.error("Message analysis error:", error);
      return {
        memories: [],
        editMemories: [],
        deleteMemories: [],
        response:
          "I apologize, but I seem to be experiencing some difficulty at the moment.",
      };
    }
  }
  // Set up message handler for the bot
  bot.on("message", async (ctx) => {
    try {
      // Get Anthropic API key from environment
      const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!apiKey) {
        console.error("Anthropic API key is not configured.");
        ctx.reply(
          "I apologize, but I'm not properly configured at the moment. Please inform the household administrator."
        );
        return;
      }
  
      // Initialize Anthropic client
      const anthropic = new Anthropic({ apiKey });
  
      // Get message text and user info
      const messageText = ctx.message.text || "";
      const username =
        ctx.message.from.username || ctx.message.from.first_name || "Sir/Madam";
      const chatId = ctx.chat.id;
      const senderId = ctx.message.from.id.toString();
      const senderName = username; // Using username as the sender name
  
      console.log({ chatId, username, messageText });
  
      // Store the incoming message in the chat history
      await storeChatMessage(chatId, senderId, senderName, messageText);
  
      // If the message is a /start command, introduce Mr. Stevens
      if (messageText === "/start") {
        const introMessage =
          "Good day. I am Mr. Stevens, at your service. I shall make note of any important matters you wish me to remember and will ensure they're properly attended to at the appropriate time. If I may, I would like to ask you a few questions to understand how I can better serve you and your household.";
        await ctx.reply(introMessage);
  
        // Store the bot's response in chat history
        await storeChatMessage(
          chatId,
          BOT_SENDER_ID,
          BOT_SENDER_NAME,
          introMessage,
          true
        );
        return;
      }
  
      // If it's another command, ignore it
      if (messageText.startsWith("/")) {
        return;
      }
  
      // Retrieve chat history for this chat, which now includes the current message we just stored
      const chatHistory = await getChatHistory(chatId);
  
      // Analyze message content with chat history context
      const analysis = await analyzeMessageContent(
        anthropic,
        username,
        messageText,
        chatHistory
      );
  
      // Create memories based on the analysis
      if (analysis.memories && analysis.memories.length > 0) {
        const { sqlite } = await import("https://esm.town/v/stevekrouse/sqlite");
        const { nanoid } = await import("https://esm.sh/nanoid@5.0.5");
  
        const createdIds = [];
  
        for (const memory of analysis.memories) {
          const memoryId = nanoid(10);
          createdIds.push(memoryId);
          await sqlite.execute({
            sql: `INSERT INTO memories (id, date, text, createdBy, createdDate, tags)
                  VALUES (:id, :date, :text, :createdBy, :createdDate, :tags)`,
            args: {
              id: memoryId,
              date: memory.date,
              text: memory.text,
              createdBy: "telegram",
              createdDate: Date.now(),
              tags: "",
            },
          });
        }
  
        console.log(
          `Created ${
            analysis.memories.length
          } memories with IDs: ${createdIds.join(", ")}`
        );
      }
  
      // Edit memories if requested
      if (analysis.editMemories && analysis.editMemories.length > 0) {
        const { sqlite } = await import("https://esm.town/v/stevekrouse/sqlite");
  
        const editedIds = [];
  
        for (const memory of analysis.editMemories) {
          if (!memory.id) {
            console.error("Cannot edit memory without ID:", memory);
            continue;
          }
  
          editedIds.push(memory.id);
  
          // Create the SET clause dynamically based on what fields are provided
          const updateFields = [];
          const args: Record<string, any> = { id: memory.id };
  
          if (memory.text !== undefined) {
            updateFields.push("text = :text");
            args.text = memory.text;
          }
  
          if (memory.date !== undefined) {
            updateFields.push("date = :date");
            args.date = memory.date;
          }
  
          if (memory.tags !== undefined) {
            updateFields.push("tags = :tags");
            args.tags = memory.tags;
          }
  
          // Only proceed if we have fields to update
          if (updateFields.length > 0) {
            const setClause = updateFields.join(", ");
            await sqlite.execute({
              sql: `UPDATE memories SET ${setClause} WHERE id = :id`,
              args,
            });
          }
        }
  
        console.log(
          `Edited ${editedIds.length} memories with IDs: ${editedIds.join(", ")}`
        );
      }
  
      // Delete memories if requested
      if (analysis.deleteMemories && analysis.deleteMemories.length > 0) {
        const { sqlite } = await import("https://esm.town/v/stevekrouse/sqlite");
  
        for (const memoryId of analysis.deleteMemories) {
          await sqlite.execute({
            sql: `DELETE FROM memories WHERE id = :id`,
            args: { id: memoryId },
          });
        }
  
        console.log(
          `Deleted ${
            analysis.deleteMemories.length
          } memories with IDs: ${analysis.deleteMemories.join(", ")}`
        );
      }
  
      // Respond with the butler-like response
      await ctx.reply(analysis.response);
  
      // Store the bot's response in chat history (without debug info to keep it clean)
      await storeChatMessage(
        chatId,
        BOT_SENDER_ID,
        BOT_SENDER_NAME,
        analysis.response,
        true
      );
    } catch (error) {
      console.error("Error processing message:", error);
      await ctx.reply(
        "I do apologize, but I seem to be experiencing some difficulty at the moment. Perhaps we could try again shortly."
      );
    }
  });
  
  // No additional commands needed for the butler interface
  
  // Handle webhook requests
  export default async function (req: Request): Promise<Response> {
    // Set webhook if it is not set yet
    if (!isEndpointSet) {
      await bot.api.setWebhook(req.url, {
        secret_token: SECRET_TOKEN,
      });
      isEndpointSet = true;
    }
  
    if (req.method === "POST") {
      return await handleUpdate(req);
    }
  
    return new Response(
      `<h1>Memory Assistant Bot</h1>
      <p>This bot helps you remember important information.</p>`,
      { status: 200, headers: { "content-type": "text/html" } }
    );
  }
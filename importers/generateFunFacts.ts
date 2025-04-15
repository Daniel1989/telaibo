import { DateTime } from "https://esm.sh/luxon@3.4.4";
import { nanoid } from "https://esm.sh/nanoid@5.0.5";
import { sqlite } from "https://esm.town/v/stevekrouse/sqlite";
import Anthropic from "npm:@anthropic-ai/sdk@0.24.3";

const TABLE_NAME = `memories`;
const TAG_NAME = "fun_fact";

/**
 * Retrieves previously generated fun facts from the memories database
 * @returns Array of previous fun facts
 */
async function getPreviousFunFacts() {
  try {
    const result = await sqlite.execute(
      `SELECT date(date) as date, text FROM ${TABLE_NAME}
       WHERE tags = ?
       ORDER BY date DESC
       LIMIT 50`,
      [TAG_NAME],
    );

    return result.rows || [];
  } catch (error) {
    console.error("Error retrieving previous fun facts:", error);
    return [];
  }
}

/**
 * Deletes existing fun facts for the specified dates
 * @param dates Array of date strings in ISO format
 */
async function deleteExistingFunFacts(dates) {
  try {
    for (const date of dates) {
      await sqlite.execute(
        `DELETE FROM ${TABLE_NAME}
         WHERE date = ? AND tags = ?`,
        [date, TAG_NAME],
      );
    }
  } catch (error) {
    console.error("Error deleting existing fun facts:", error);
  }
}

/**
 * Inserts a fun fact into the memories database
 * @param date Date for the fun fact in ISO format
 * @param factText The fun fact text
 */
async function insertFunFact(date, factText) {
  try {
    await sqlite.execute(
      `INSERT INTO ${TABLE_NAME} (id, date, text, createdBy, createdDate, tags)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        nanoid(10),
        date,
        `fun fact: ${factText}`,
        "fun_fact_generator",
        Date.now(),
        TAG_NAME,
      ],
    );
  } catch (error) {
    console.error(`Error inserting fun fact for ${date}:`, error);
  }
}

/**
 * Generates fun facts for the next 7 days using Claude AI
 * @param previousFacts Previous fun facts to avoid duplication
 * @returns Array of generated fun facts
 */
async function generateFunFacts(previousFacts) {
  try {
    // Get API key from environment
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.error("Anthropic API key is not configured.");
      return null;
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey });

    // Format previous facts for the prompt
    const previousFactsText = previousFacts
      .map((fact) => `- ${fact.date}: ${fact.text}`)
      .join("\n");

    // Get today's date in US Eastern Time
    const today = DateTime.now().setZone("America/New_York").startOf("day");

    // Hana's birthday - adjust as needed
    const hanaBirthday = "2025-03-26";
    const currentDate = today.toFormat("yyyy-MM-dd");

    // Format dates for the next 7 days
    const nextSevenDays = Array.from({ length: 7 }, (_, i) => {
      const date = today.plus({ days: i });
      return date.toFormat("yyyy-MM-dd");
    });

    const message =
      `Generate 7 unique fun facts, one for each of the next 7 days. Each fact should be brief (1-2 sentences) and relate to one of these categories:

1. Infant development appropriate for Miss Hana, who was born on ${hanaBirthday} (today is ${currentDate})
2. Cute animals: capybaras, border collies, elephants, or penguins
3. Plants: monsteras, orchids, ficus, or other common houseplants

Requirements:
- Each fact must be interesting, educational, and appropriate for formal communication
- Keep each fact to 1-2 sentences maximum
- Use different categories across the 7 days for variety
- Ensure facts are scientifically accurate
- Make infant development facts age-appropriate for Miss Hana based on her birthdate
- Do not repeat any previous facts from this list:

${previousFactsText}

FORMAT YOUR RESPONSE AS STRUCTURED JSON INSIDE XML TAGS:
<facts>
[
  {
    "date": "YYYY-MM-DD",
    "text": "The fun fact text here",
    "category": "infant" | "animal" | "plant"
  },
  ... (repeat for all 7 days)
]
</facts>

Use these dates for the 7 facts:
${nextSevenDays.join("\n")}`;

    console.log({ message });

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        },
      ],
    });

    // Extract and parse the response
    const responseText = response.content[0].text.trim();

    // Extract JSON between <facts> tags
    const factsMatch = responseText.match(/<facts>([\s\S]*?)<\/facts>/);

    if (!factsMatch || factsMatch.length < 2) {
      console.error("Failed to parse facts from response:", responseText);
      return [];
    }

    try {
      // Parse the JSON from the extracted content
      const factData = JSON.parse(factsMatch[1]);

      // Validate and format facts
      const facts = factData.map((fact) => ({
        date: fact.date,
        text: fact.text,
        category: fact.category,
      }));

      return facts;
    } catch (parseError) {
      console.error("Failed to parse facts JSON:", parseError);
      console.log("Raw response:", responseText);

      // Fallback to regex parsing if JSON parsing fails
      return parseFallbackFacts(responseText, nextSevenDays);
    }
  } catch (error) {
    console.error("Error generating fun facts:", error);
    return [];
  }
}

/**
 * Fallback parser for when JSON parsing fails
 * @param responseText The raw response text from Claude
 * @param expectedDates Array of expected dates for facts
 * @returns Array of parsed facts
 */
function parseFallbackFacts(responseText, expectedDates) {
  // Try to extract facts using regex
  const factPattern = /(\d{4}-\d{2}-\d{2})["']?[,:]?\s*["']?(.*?)["']?[,}]/gs;
  const facts = [];
  let match;

  while ((match = factPattern.exec(responseText)) !== null) {
    if (match.length >= 3) {
      facts.push({
        date: match[1],
        text: match[2].trim(),
      });
    }
  }

  // If we couldn't extract any facts, try another approach
  if (facts.length === 0) {
    // Look for quoted text that might be facts
    const lines = responseText.split("\n");
    let currentDate = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check if this line contains a date
      const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        currentDate = dateMatch[1];
      } else if (currentDate && line.length > 10) {
        // If we have a date and this is a non-empty line, treat it as a fact
        facts.push({
          date: currentDate,
          text: line.replace(/["']/g, "").trim(),
        });
        currentDate = null;
      }
    }
  }

  // As a last resort, assign facts to dates in order
  if (facts.length === 0 && expectedDates.length > 0) {
    // Extract any sentences that look like facts
    const sentences = responseText.match(/[^.!?]+[.!?]+/g) || [];

    for (let i = 0; i < Math.min(sentences.length, expectedDates.length); i++) {
      let factText = sentences[i].trim();

      // Clean up the fact text
      factText = factText.replace(/["']/g, "").trim();

      if (factText.length > 10) {
        facts.push({
          date: expectedDates[i],
          text: factText,
        });
      }
    }
  }

  return facts;
}

/**
 * Main function to generate and store fun facts for the next 7 days
 */
export async function generateAndStoreFunFacts() {
  try {
    // Get previous fun facts
    const previousFacts = await getPreviousFunFacts();

    // Generate new fun facts
    const newFacts = await generateFunFacts(previousFacts);

    if (!newFacts || newFacts.length === 0) {
      console.error("Failed to generate fun facts");
      return "Failed to generate fun facts";
    }

    // Get dates for the next 7 days
    const today = DateTime.now().setZone("America/New_York").startOf("day");
    const nextSevenDays = Array.from({ length: 7 }, (_, i) => {
      return today.plus({ days: i }).toFormat("yyyy-MM-dd");
    });

    // Delete existing fun facts for these dates
    await deleteExistingFunFacts(nextSevenDays);

    // Insert new fun facts
    for (const fact of newFacts) {
      await insertFunFact(fact.date, fact.text);
    }

    console.log(`Generated and stored ${newFacts.length} fun facts`);
    return `Generated and stored ${newFacts.length} fun facts`;
  } catch (error) {
    console.error("Error in generateAndStoreFunFacts:", error);
    return "Error generating fun facts";
  }
}

/**
 * Cron job entry point - runs weekly to generate fun facts for the next 7 days
 * Intended to be used as a Val Town cron job
 */
export default async function() {
  console.log("Running fun facts generation cron job...");
  return await generateAndStoreFunFacts();
}

// For testing with Deno directly
if (import.meta.main) {
  await generateAndStoreFunFacts();
}
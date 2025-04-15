import { DateTime } from "https://esm.sh/luxon@3.4.4";
import Anthropic from "npm:@anthropic-ai/sdk@0.24.3";

const RECIPIENTS = ["Geoffrey", "Maggie"] as const;

function parseDateFromSubject(subject: string): string | null {
  const match = subject.match(/(\w{3}), (\d{1,2}\/\d{1,2})/);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return null;
}

type ImageSummary = {
  sender: string;
  recipient: (typeof RECIPIENTS)[number] | "both" | "other";
  type: "personal" | "transactional" | "ad";
  notes?: string;
};

async function analyzeHtmlContent(
  anthropic: Anthropic,
  htmlContent: string,
  imageSummaries: ImageSummary[]
) {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 4196,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze the following content from an email and provide a response as a JSON blob (only JSON, no other text) with two parts.

                The email is from the USPS showing mail I'm receiving. Metadata about packages is stored directly in the email. Info about mail pieces is in images, so I've included summaries of those as well.

                Your response should include:

              1. An array of upcoming packages, where each package has:
                 - sender: string (name of the sender)
                 - status: "expected today" | "expected 1-2 days" | "awaiting from sender"

              2. A short positive couple sentences summarizing the mail, like a competent executive assistant would. Examples:
                 - "Quiet day today! Just a couple ads, nothing of note"
                 - "A few packages arriving soon, keep an eye out!"
                 - "Looks like a couple possibly important things today, make sure to review the letter from the IRS."

              Respond with a JSON object in this format:
              {
                "packages": [
                  { "sender": string, "status": string },
                  ...
                ],
                "summary": string
              }

              Do not include any other text in your response, only a JSON blob.

              Here's the HTML content of the email:

              ${htmlContent}

              And here is info about the mail pieces:

              ${JSON.stringify(imageSummaries)}`,
            },
          ],
        },
      ],
    });

    return JSON.parse(response.content[0].text);
  } catch (error) {
    console.error("HTML analysis error:", error);
    return { packages: [], summary: "Unable to analyze email content." };
  }
}

export default async function (e: Email) {
  console.log("email content");
  console.log(e.html);
  console.log(e.text);

  // Get Anthropic API key from environment
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error("Anthropic API key is not configured for this val.");
    return;
  }

  // Initialize Anthropic client
  const anthropic = new Anthropic({ apiKey });

  // Process each image attachment serially
  const summaries = [];
  for (const [index, attachment] of e.attachments.entries()) {
    try {
      const imageData = await attachment.arrayBuffer();
      const base64Image = btoa(
        String.fromCharCode(...new Uint8Array(imageData))
      );

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 4196,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: attachment.type,
                  data: base64Image,
                },
              },
              {
                type: "text",
                text: `This is a scan of a piece of mail we received at our household. Respond with a JSON blob summarizing the piece of mail, with the following fields:

                {
                  /* Name of sender as written on mail, e.g. "Delta Airlines" for a business, or "John Doe" for an individual */
                  sender: string;

                  /* Name of recipient. Usually should be either Geoffrey or Maggie (Margaret). If it's to both of us, use "Both". For any other recipient use "Other"  */
                  recipient: "Geoffrey" | "Maggie" | "Both" | "Other";

                  /* Guess what type of mail it is. Usually, mail from an individual is personal. "Transactional" is things like bills or reports that might require action. If it's clearly an ad (eg, an offer for a credit card, or a catalog), mark it "ad". If you're not sure, lean "transactional" so we don't miss those by accident. */
                  type: "personal" | "transactional" | "ad"

                  /* Optional: any extra writing on the scan, e.g. "important, action required" */
                  notes?: string;
                }

                Don't return any other text in your response, just a JSON blob.
                `,
              },
            ],
          },
        ],
      });

      const parsedResponse = JSON.parse(response.content[0].text);
      summaries.push(parsedResponse);
    } catch (error) {
      console.error(`Image analysis error:`, error);
      summaries.push({
        sender: "Error",
        recipient: "Error",
        type: "error",
        notes: `Image ${index + 1} Analysis Failed: ${error.message}`,
      });
    }
  }

  // Analyze HTML content
  const htmlAnalysis = await analyzeHtmlContent(
    anthropic,
    e.html || "",
    summaries
  );

  const localDate = DateTime.now().setZone("America/New_York").toISO();

  // Create memories for mail and packages
  const memories = [];

  // Memory for mail
  if (summaries.length > 0) {
    memories.push(`expecting mail: ${JSON.stringify(summaries)}`);
  }

  // Memory for packages
  if (htmlAnalysis.packages.length > 0) {
    memories.push(
      `expecting package: ${JSON.stringify(htmlAnalysis.packages)}`
    );
  }

  // Insert memories into SQLite
  const { sqlite } = await import("https://esm.town/v/stevekrouse/sqlite");
  const { nanoid } = await import("https://esm.sh/nanoid@5.0.5");

  // Insert memories
  for (const memory of memories) {
    await sqlite.execute({
      sql: `INSERT INTO memories (id, date, text, createdBy, createdDate, tags)
            VALUES (:id, :date, :text, :createdBy, :createdDate, :tags)`,
      args: {
        id: nanoid(10),
        date: localDate,
        text: memory,
        createdBy: "usps",
        createdDate: Date.now(),
        tags: "mail",
      },
    });
  }

  console.log("Memories inserted successfully.");
}
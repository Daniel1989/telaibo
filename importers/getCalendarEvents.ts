import { getEvents } from "https://esm.town/v/geoffreylitt/getGoogleCalendarEvents";
import { sqlite } from "https://esm.town/v/stevekrouse/sqlite";
import { DateTime } from "https://esm.sh/luxon@3.4.4";

const TABLE_NAME = `memories`;
const LOCAL_TIMEZONE = "America/New_York";

async function deleteExistingCalendarEvents() {
  await sqlite.execute(
    `
    DELETE FROM ${TABLE_NAME}
    WHERE createdBy = 'calendar'
    `
  );
}

// Helper function to extract time from ISO string without timezone conversion
function extractTimeFromISO(isoString) {
  // Match the time portion of the ISO string
  const timeMatch = isoString.match(/T(\d{2}):(\d{2}):/);
  if (!timeMatch) return null;

  const hours = parseInt(timeMatch[1], 10);
  const minutes = timeMatch[2];

  // Format as AM/PM
  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM

  return `${hour12}:${minutes} ${period}`;
}

function formatEventToNaturalLanguage(event) {
  const summary = event.summary || "Untitled event";

  if (event.start.dateTime) {
    // This is a timed event
    const startTime = extractTimeFromISO(event.start.dateTime);
    const endTime = extractTimeFromISO(event.end.dateTime);

    // Get timezone information from the event
    const timezone =
      event.start.timeZone ||
      (event.start.dateTime.includes("+") || event.start.dateTime.includes("-")
        ? event.start.dateTime.match(/[+-]\d{2}:\d{2}$/)?.[0]
        : "UTC");

    // Check if timezone is America/New_York or equivalent (-04:00 or -05:00 depending on DST)
    const isLocalTimezone =
      timezone === LOCAL_TIMEZONE ||
      timezone?.startsWith("-04:00") ||
      timezone?.startsWith("-05:00");

    let text = `${summary} from ${startTime} - ${endTime}`;

    // Add timezone info if not a local timezone
    if (timezone && !isLocalTimezone) {
      // If it's a named timezone like America/Los_Angeles
      if (timezone.includes("/")) {
        const friendlyTimezone =
          timezone.split("/")[1].replace("_", " ").toLowerCase() + " time";
        text += ` (${friendlyTimezone})`;
      }
      // If it's an offset like +08:00
      else if (timezone.match(/[+-]\d{2}:\d{2}/)) {
        text += ` (${timezone})`;
      }
    }

    if (event.location) {
      text += ` at ${event.location}`;
    }

    return text;
  } else if (event.start.date) {
    // This is an all-day event
    return `All-day event: ${summary}${
      event.location ? ` at ${event.location}` : ""
    }`;
  }

  return summary;
}

async function insertCalendarEvent(date, eventText) {
  const { nanoid } = await import("https://esm.sh/nanoid@5.0.5");

  console.log("inserting", { date, eventText });

  await sqlite.execute(
    `
    INSERT INTO ${TABLE_NAME} (id, date, text, createdBy, createdDate, tags)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [nanoid(10), date, eventText, "calendar", Date.now(), "calendar"]
  );
}

export default async function getCalendarEvents() {
  try {
    const events = await getEvents(
      Deno.env.get("GOOGLE_CALENDAR_ACCOUNT_ID"),
      Deno.env.get("GOOGLE_CALENDAR_CALENDAR_ID")
    );

    console.log(`Found ${events.length} calendar events`);

    await deleteExistingCalendarEvents();

    for (const event of events) {
      let date;
      if (event.start.dateTime) {
        // Extract date in YYYY-MM-DD format from ISO string
        date = event.start.dateTime.split("T")[0];
      } else if (event.start.date) {
        date = event.start.date;
      } else {
        console.warn(`Event ${event.summary} has no start date/time, skipping`);
        continue;
      }

      const eventText = formatEventToNaturalLanguage(event);
      console.log(`Adding calendar event for ${date}: ${eventText}`);
      await insertCalendarEvent(date, eventText);
    }

    console.log(`Calendar events imported into the database.`);
    return events;
  } catch (error) {
    console.error("Error importing calendar events:", error);
    throw error;
  }
}
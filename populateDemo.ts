import { nanoid } from "https://esm.sh/nanoid@5.0.5";
import { sqlite } from "https://esm.town/v/stevekrouse/sqlite";

const TABLE_NAME = "memories_demo";

// Create the memories_demo table
async function createMemoriesDemoTable() {
  try {
    await sqlite.execute(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        id TEXT PRIMARY KEY,
        date TEXT,
        text TEXT NOT NULL,
        createdBy TEXT,
        createdDate NUMBER,
        tags TEXT
      )
    `);
    console.log(`Created table: ${TABLE_NAME}`);
  } catch (error) {
    console.error("Error creating memories_demo table:", error);
    throw error;
  }
}

// Create a fake memory with proper ID and timestamps
function createMemory(date, text, createdBy, tags, createdDateOffset = 0) {
  const id = nanoid(10);
  // Base date is April 5, 2025
  const baseDate = new Date("2025-04-05").getTime();
  // Add random offset to createdDate (within reasonable bounds)
  const createdDate = baseDate + createdDateOffset;

  return {
    id,
    date, // Can be null for undated memories
    text,
    createdBy,
    createdDate,
    tags,
  };
}

// Seed data for the Doe family
const demoMemories = [
  // Weather forecasts
  createMemory(
    "2025-04-11",
    "weather forecast: High of 72, low of 54, sunny morning giving way to scattered clouds in the afternoon.",
    "weather",
    "weather",
    -518400000,
  ),
  createMemory(
    "2025-04-12",
    "weather forecast: High of 68, low of 51, partly cloudy with a 30% chance of light showers in the evening.",
    "weather",
    "weather",
    -432000000,
  ),
  createMemory(
    "2025-04-13",
    "weather forecast: High of 65, low of 48, overcast with intermittent drizzle throughout the day.",
    "weather",
    "weather",
    -345600000,
  ),
  createMemory(
    "2025-04-14",
    "weather forecast: High of 62, low of 46, morning fog clearing to reveal sunny skies by midday.",
    "weather",
    "weather",
    -259200000,
  ),
  createMemory(
    "2025-04-15",
    "weather forecast: High of 70, low of 53, clear and mild with light breezes from the southwest.",
    "weather",
    "weather",
    -172800000,
  ),
  createMemory(
    "2025-04-16",
    "weather forecast: High of 75, low of 57, warm and mostly sunny with increasing humidity.",
    "weather",
    "weather",
    -86400000,
  ),
  createMemory(
    "2025-04-17",
    "weather forecast: High of 77, low of 60, hot and humid with potential thunderstorms developing late afternoon.",
    "weather",
    "weather",
    0,
  ),

  // Calendar events
  createMemory(
    "2025-04-12",
    "Lucas's soccer practice from 10:00 am - 11:30 am at Oakridge Community Fields",
    "calendar",
    "calendar",
    -518400000,
  ),
  createMemory(
    "2025-04-14",
    "Emma's science club meeting from 3:30 pm - 5:00 pm at Lincoln Middle School",
    "calendar",
    "calendar",
    -432000000,
  ),
  createMemory(
    "2025-04-15",
    "Parent-teacher conference from 4:00 pm - 4:30 pm at Lincoln Middle School",
    "calendar",
    "calendar",
    -345600000,
  ),
  createMemory(
    "2025-04-16",
    "John's dental checkup from 2:15 pm - 3:00 pm at Brightsmile Dental Clinic",
    "calendar",
    "calendar",
    -259200000,
  ),
  createMemory(
    "2025-04-17",
    "Jane's research presentation from 1:00 pm - 2:30 pm at University Biology Department",
    "calendar",
    "calendar",
    -172800000,
  ),
  createMemory(
    "2025-04-19",
    "Family dinner reservation from 6:30 pm - 8:30 pm at Riverside Italian Bistro",
    "calendar",
    "calendar",
    -86400000,
  ),
  createMemory(
    "2025-04-21",
    "Emma's piano recital from 5:00 pm - 7:00 pm at Community Arts Center",
    "calendar",
    "calendar",
    0,
  ),

  // Fun facts
  createMemory(
    "2025-04-11",
    "fun fact: Border collies can learn over 1,000 words and recognize objects by name, rivaling the linguistic capabilities of a 2-year-old human child.",
    "fun_fact_generator",
    "fun_fact",
    -518400000,
  ),
  createMemory(
    "2025-04-12",
    "fun fact: Monstera plants develop their characteristic holes through a process called fenestration, which helps them resist damage from heavy rainfall and allows light to reach lower leaves.",
    "fun_fact_generator",
    "fun_fact",
    -432000000,
  ),
  createMemory(
    "2025-04-13",
    "fun fact: Elephant calves can stand within 20 minutes of birth and can walk within 1 hour, an evolutionary adaptation that helps them keep up with the constantly moving herd.",
    "fun_fact_generator",
    "fun_fact",
    -345600000,
  ),
  createMemory(
    "2025-04-14",
    "fun fact: At two years old, children typically have a vocabulary of 50-200 words and are beginning to form simple two-word sentences like 'more juice' or 'daddy home'.",
    "fun_fact_generator",
    "fun_fact",
    -259200000,
  ),
  createMemory(
    "2025-04-15",
    "fun fact: Orchids have evolved specialized relationships with specific pollinators; some species emit scents that mimic female insects to attract males for pollination.",
    "fun_fact_generator",
    "fun_fact",
    -172800000,
  ),
  createMemory(
    "2025-04-16",
    "fun fact: Penguins propose to their mates with a pebble, and if accepted, the pebble is used in their nest. They typically mate for life.",
    "fun_fact_generator",
    "fun_fact",
    -86400000,
  ),
  createMemory(
    "2025-04-17",
    "fun fact: By age two, toddlers can recognize familiar melodies and may begin to sing along with simple songs, demonstrating early musical development.",
    "fun_fact_generator",
    "fun_fact",
    0,
  ),

  // USPS package tracking
  createMemory(
    "2025-04-12",
    "expecting package: [{\"sender\":\"BOOK DEPOSITORY\",\"status\":\"awaiting from sender\"}]",
    "usps",
    "mail",
    -518400000,
  ),
  createMemory(
    "2025-04-13",
    "expecting package: [{\"sender\":\"BOOK DEPOSITORY\",\"status\":\"expected today\"},{\"sender\":\"AMAZON\",\"status\":\"awaiting from sender\"}]",
    "usps",
    "mail",
    -432000000,
  ),
  createMemory(
    "2025-04-14",
    "expecting package: [{\"sender\":\"AMAZON\",\"status\":\"expected 1-2 days\"},{\"sender\":\"UNIVERSITY BOOKSTORE\",\"status\":\"awaiting from sender\"}]",
    "usps",
    "mail",
    -345600000,
  ),
  createMemory(
    "2025-04-15",
    "expecting package: [{\"sender\":\"UNIVERSITY BOOKSTORE\",\"status\":\"expected today\"},{\"sender\":\"GARDENING SUPPLY CO\",\"status\":\"awaiting from sender\"}]",
    "usps",
    "mail",
    -259200000,
  ),
  createMemory(
    "2025-04-16",
    "expecting package: [{\"sender\":\"GARDENING SUPPLY CO\",\"status\":\"expected 1-2 days\"},{\"sender\":\"SOCCER EQUIPMENT PLUS\",\"status\":\"awaiting from sender\"}]",
    "usps",
    "mail",
    -172800000,
  ),

  // Mail
  createMemory(
    "2025-04-12",
    "expecting mail: [{\"sender\":\"Lincoln Middle School\",\"recipient\":\"John\",\"type\":\"transactional\",\"notes\":\"Science Fair Information\"}]",
    "usps",
    "mail",
    -518400000,
  ),
  createMemory(
    "2025-04-13",
    "expecting mail: [{\"sender\":\"University Biology Department\",\"recipient\":\"Jane\",\"type\":\"transactional\",\"notes\":\"Research Grant Approval\"}]",
    "usps",
    "mail",
    -432000000,
  ),
  createMemory(
    "2025-04-15",
    "expecting mail: [{\"sender\":\"City Water Utility\",\"recipient\":\"John\",\"type\":\"transactional\"}]",
    "usps",
    "mail",
    -259200000,
  ),

  // Telegram messages
  createMemory(
    "2025-04-11",
    "Jane prefers Earl Grey tea in the morning.",
    "telegram",
    "telegram",
    -518400000,
  ),
  createMemory(
    "2025-04-12",
    "John's parents visiting for dinner on Sunday, April 20th. They're vegetarians.",
    "telegram",
    "telegram",
    -432000000,
  ),
  createMemory(
    "2025-04-13",
    "Lucas allergic to peanuts - mild reaction only, not anaphylactic.",
    "telegram",
    "telegram",
    -345600000,
  ),
  createMemory(
    "2025-04-14",
    "Emma's birthday party theme will be astronomy/space.",
    "telegram",
    "telegram",
    -259200000,
  ),
  createMemory(
    "2025-04-15",
    "Jane working from home on Mondays and Wednesdays.",
    "telegram",
    "telegram",
    -172800000,
  ),
  createMemory(
    "2025-04-16",
    "John has a deadline for software project on April 22nd.",
    "telegram",
    "telegram",
    -86400000,
  ),
  createMemory(
    "2025-04-17",
    "Both children need to bring packed lunches for school field trip on April 18th.",
    "telegram",
    "telegram",
    0,
  ),

  // Undated memories (general family information)
  createMemory(
    null,
    "John Doe works as a software engineer at TechCorp.",
    "telegram",
    "telegram",
    -604800000,
  ),
  createMemory(
    null,
    "Jane Doe works as a biology professor at State University.",
    "telegram",
    "telegram",
    -604800000,
  ),
  createMemory(
    null,
    "Emma Doe is 10 years old, interested in astronomy and piano.",
    "telegram",
    "telegram",
    -604800000,
  ),
  createMemory(
    null,
    "Lucas Doe is 7 years old, interested in soccer and dinosaurs.",
    "telegram",
    "telegram",
    -604800000,
  ),
  createMemory(
    null,
    "Family grocery shopping usually at Whole Foods or Trader Joe's.",
    "telegram",
    "telegram",
    -604800000,
  ),
  createMemory(
    null,
    "John's parents are Robert and Martha Doe, living in Chicago.",
    "telegram",
    "telegram",
    -604800000,
  ),
  createMemory(
    null,
    "Jane's sister Sarah lives nearby and sometimes picks up the children from school.",
    "telegram",
    "telegram",
    -604800000,
  ),
  createMemory(
    null,
    "Emma's birthday is June 15, Lucas's birthday is September 22.",
    "telegram",
    "telegram",
    -604800000,
  ),
  createMemory(
    null,
    "John and Jane's anniversary is October 8.",
    "telegram",
    "telegram",
    -604800000,
  ),
];

// Insert memories into the database
async function insertDemoMemories() {
  try {
    // Clear existing data if any
    await sqlite.execute(`DELETE FROM ${TABLE_NAME}`);

    let insertedCount = 0;

    for (const memory of demoMemories) {
      await sqlite.execute(
        `INSERT INTO ${TABLE_NAME} (id, date, text, createdBy, createdDate, tags)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          memory.id,
          memory.date,
          memory.text,
          memory.createdBy,
          memory.createdDate,
          memory.tags,
        ],
      );
      insertedCount++;
    }

    console.log(`Successfully inserted ${insertedCount} demo memories.`);
    return `Successfully inserted ${insertedCount} demo memories.`;
  } catch (error) {
    console.error("Error inserting demo memories:", error);
    throw error;
  }
}

// Main function to populate demo data
export default async function populateDemo() {
  try {
    // Create the table
    await createMemoriesDemoTable();

    // Insert demo memories
    await insertDemoMemories();

    console.log("Demo database successfully populated!");
    return "Demo database successfully populated!";
  } catch (error) {
    console.error("Error populating demo database:", error);
    throw error;
  }
}

// Uncomment to run directly when testing
populateDemo();
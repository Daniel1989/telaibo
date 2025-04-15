import {
    getWeather,
    WeatherResponse,
  } from "https://esm.town/v/geoffreylitt/getWeather";
  import { sqlite } from "https://esm.town/v/stevekrouse/sqlite";
  import Anthropic from "npm:@anthropic-ai/sdk@0.24.3";
  
  const TABLE_NAME = `memories`;
  
  function summarizeWeather(weather: WeatherResponse) {
    const summarizeDay = (day: WeatherResponse["weather"][number]) => ({
      date: day.date,
      highTemp: day.maxtempF,
      lowTemp: day.mintempF,
      hourly:
        day.hourly?.map((hour) => ({
          time: hour.time,
          temp: hour.tempF,
          chanceOfRain: hour.chanceofrain,
          chanceOfSnow: hour.chanceofsnow,
          desc: hour.weatherDesc.map((desc) => desc.value).join(", "),
        })) ?? [],
    });
    return weather.weather.map((day) => summarizeDay(day));
  }
  
  async function generateConciseWeatherSummary(weatherDay) {
    try {
      // Get API key from environment
      const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!apiKey) {
        console.error("Anthropic API key is not configured.");
        return null;
      }
  
      // Initialize Anthropic client
      const anthropic = new Anthropic({ apiKey });
  
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `
  You are a weather forecaster. Create a very concise summary of this weather forecast data.
  Include the high and low temperatures and a brief summary of the overall weather conditions throughout the day.
  The summary should be helpful for someone planning their day - mention any precipitation, temperature changes, or other notable patterns.
  Keep it under 25 words if possible, no more than one sentence. Don't include the date.
  
  Examples:
  - "High of 50, low of 31, clear and sunny all day."
  - "High of 80, low of 50, cool and clear morning, warmer afternoon with scattered showers starting around 2pm."
  
  Weather data:
  ${JSON.stringify(weatherDay, null, 2)}
  
  Your concise summary:
  `,
              },
            ],
          },
        ],
      });
  
      // Extract and clean up the summary
      let summary = response.content[0].text.trim();
  
      // Remove any "Your concise summary:" text if it got included
      summary = summary.replace(/^(your concise summary:)/i, "").trim();
  
      // Remove quotes if the model included them
      summary = summary.replace(/^["']|["']$/g, "").trim();
  
      return summary;
    } catch (error) {
      console.error("Error generating weather summary:", error);
      return JSON.stringify(weatherDay); // Fallback to JSON if summary fails
    }
  }
  
  async function deleteExistingForecast(date: string) {
    await sqlite.execute(
      `
      DELETE FROM ${TABLE_NAME}
      WHERE date = ? AND text LIKE 'weather forecast:%'
    `,
      [date]
    );
  }
  
  async function insertForecast(date: string, forecast: string) {
    const { nanoid } = await import("https://esm.sh/nanoid@5.0.5");
  
    await sqlite.execute(
      `
      INSERT INTO ${TABLE_NAME} (id, date, text, createdBy, createdDate, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        nanoid(10),
        date,
        `weather forecast: ${forecast}`,
        "weather",
        Date.now(),
        "weather",
      ]
    );
  }
  
  export default async function getWeatherForecast(interval: number) {
    const weather = await getWeather("Washington, DC");
    console.log({ weather });
    const summary = summarizeWeather(weather);
  
    for (const day of summary) {
      const date = new Date(day.date).toISOString().split("T")[0];
  
      // Generate concise text summary instead of using JSON
      const conciseSummary = await generateConciseWeatherSummary(day);
  
      // If summary generation failed, it will fall back to JSON
      const forecastText = conciseSummary || JSON.stringify(day);
  
      await deleteExistingForecast(date);
      await insertForecast(date, forecastText);
    }
  
    console.log(`Weather forecast updated in the database.`);
    return summary;
  }
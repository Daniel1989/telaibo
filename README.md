# Stevens

> "The great butlers are great by virtue of their ability to inhabit their professional role and inhabit it to the utmost; they will not be shaken out by external events, however surprising, alarming or vexing."
>
> — the great butler Stevens, in *The Remains of the Day* by Kazuo Ishiguro

Stevens is your personal digital butler, ever vigilant and ever helpful in managing the complexities of your digital life.

Much like his literary namesake, he takes great pride in his work, maintaining a dignified and professional demeanor while ensuring your affairs are in perfect order.

In the grand tradition of English butlers, Stevens has been designed to be both unobtrusive and indispensable. His primary duty is to learn about your life's context and provide you with daily briefs that keep you informed while saving you precious time.

## Technical Architecture

**⚠️ important caveat: the admin dashboard doesn't have auth! currently it just relies on security by obscurity of people not knowing the url to a private val. this is not very secure. if you fork this project and put sensitive data in a database you should think carefully about how to secure it.**

Stevens has been designed with the utmost simplicity and extensibility, much like a well-organized household. At the heart of his operation lies a single "memories" table - a digital equivalent of a butler's meticulous records. This table serves as the foundation for all of Stevens' operations.

### Core Components

1. **Memories Table**: A freeform repository of all that Stevens deems worth remembering, much like a butler's mental catalog of household affairs.

   **Schema**:
   - `id`: String - Unique identifier for each memory (generated using nanoid)
   - `date`: String - Date in ISO format (YYYY-MM-DD)
   - `text`: String - Content of the memory (e.g., "weather forecast: High of 75, low of 60, partly cloudy")
   - `createdBy`: String - Source of the memory (e.g., "weather", "email")
   - `createdDate`: Number - Timestamp in milliseconds when the memory was created
   - `tags`: String - Categories for organizing memories (e.g., "weather")

2. **Importers**: These are Stevens' eyes and ears in the digital world, gathering information from various sources:
   - Weather reports
   - Postal service updates
   - Ingesting messages from email or TElegram
   - And other sources of information that might be of interest to you

3. **Workflows**: Stevens' carefully orchestrated routines that utilize his memories to assist you:
   - Morning briefs sent via Telegram or email
   - Responding to questions via text message


### Folder layout

- `importers`: cron jobs for importing data into the memories table
- `dashboard`: the admin view for showing the memories notebook + visualizing imports
- `dailyBriefing`: stuff related to sending a daily update via telegram
- `dbUtils`: little one-off scripts for database stuff

## Hiring your own Stevens

This project isn't intended to be runnable out of the box, but you can adapt it for yourself if you fork the code.

You'll need to set up some environment variables to make it run.

- `ANTHROPIC_API_KEY` for LLM calls
- You'll need to follow [these instructions](https://docs.val.town/integrations/telegram/) to make a telegram bot, and set `TELEGRAM_TOKEN`. You'll also need to get a `TELEGRAM_CHAT_ID` in order to have the bot remember chat contents.
- For the Google Calendar integration you'll need `GOOGLE_CALENDAR_ACCOUNT_ID` and `GOOGLE_CALENDAR_CALENDAR_ID`. See [these instuctions](https://www.val.town/v/stevekrouse/pipedream) for details.

**important caveat: the admin dashboard doesn't have auth! currently it just relies on security by obscurity of people not knowing the url to a private val. this is not very secure, if you put sensitive data in a database you should think carefully about how to secure it.**

Overall it's a simple enough project that I encourage you to just copy the ideas and run in your own direction rather than try to use it as-is.


## link
https://www.geoffreylitt.com/2025/04/12/how-i-made-a-useful-ai-assistant-with-one-sqlite-table-and-a-handful-of-cron-jobs
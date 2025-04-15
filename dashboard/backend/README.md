# Backend

This folder contains all backend-only code in this project. It's broken up into:

* `index.ts` - this is the **entrypoint** for this whole project
* `database/` - this contains the code for interfacing with the app's SQLite database table

## Hono

This app uses [Hono](https://hono.dev/) as the API framework. You can think of Hono as a replacement for [ExpressJS](https://expressjs.com/) that works in serverless environments like Val Town or Cloudflare Workers. If you come from Python or Ruby, Hono is also a lot like [Flask](https://github.com/pallets/flask) or [Sinatra](https://github.com/sinatra/sinatra), respectively.

## Serving assets to the frontend

This backend HTTP server is responsible for serving all static assets to the browser to render the app, including HTML, JavaScript (including all client-side React), CSS, and even the favicon SVG.

In a normal server environment, you would likely use a middleware [like this one](https://hono.dev/docs/getting-started/nodejs#serve-static-files) to serve static files. Some frameworks or deployment platforms automatically make any content inside a `public/` folder public. 

However in Val Town you need to handle this yourself, and it can be suprisingly difficult to read and serve files in a Val Town Project. This template uses helper functions from [stevekrouse/utils/serve-public](https://www.val.town/x/stevekrouse/utils/branch/main/code/serve-public/README.md), which handle reading project files in a way that will work across branches and forks, automatically transpiles typescript to javascript, and assigns content-types based on the file's extension.

### `index.html`

The most complicated part of this backend API is serving index.html. In this app (like most apps) we serve it at the root, ie `GET /`. 

We *bootstrap* `index.html` with some initial data from the server, so that it gets dynamically injected JSON data without having to make another round-trip request to the server to get that data on the frontend. This is a common pattern for client-side rendered apps.

## CRUD API Routes

This app has two CRUD API routes: for reading and inserting into the messages table. They both speak JSON, which is standard. They import their functions from `/backend/database/queries.ts`. These routes are called from the React app to refresh and update data.

## Errors

Hono and other API frameworks have a habit of swallowing up Errors. We turn off this default behavior by re-throwing errors, because we think most of the time you'll want to see the full stack trace instead of merely "Internal Server Error". You can customize how you want errors to appear.
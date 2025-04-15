# React Hono Val Town Project Starter Template

This is a starter template for a full-stack app in a Val Town Project. The app itself is a simple persistent message board.

This app is broken up into three folders, corresponding to where the code in those folders run:

- `backend/` - runs on Val Town serverless infrastructure in Deno
- `frontend/` - runs in the user's browser
- `shared/` - runs in both the frontend and backend

The entrypoint of this app is `backend/index.ts`, which is the Hono HTTP server, which serves the HTML, CSS, and JS, which run client-side.

You can click into each of those folders to view their respective READMEs.
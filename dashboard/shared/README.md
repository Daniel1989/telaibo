# Shared

It's common to have code and types that are needed on both the frontend and the backend. It's important that you write this code in a particularly defensive way because it's limited by what both environments support:

![shapes at 25-02-25 11.57.13.png](https://imagedelivery.net/iHX6Ovru0O7AjmyT5yZRoA/75db1d51-d9b3-45e0-d178-25d886c10700/public)

For example, you *cannot* use the `Deno` keyword. For imports, you can't use `npm:` specifiers, so we reccomend `https://esm.sh` because it works on the server & client. You *can* use TypeScript because that is transpiled in `/backend/index.ts` for the frontend. Most code that works on the frontend tends to work in Deno, because Deno is designed to support "web-standards", but there are definitely edge cases to look out for.
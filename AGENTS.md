## Project Overview

Talntir is a Next.js application for AI-native talent discovery that
scrapes and assesses multiple public data sources across the web.

## Convex 

Where possible and EASY to use Convex use it. https://docs.convex.dev/home

## Code Style

- Always use as much proper typing as possible.
- Use zod where possible for schema validation. Use `z.url()` for URL validation, not `z.string().url()`.
- Limit as much duplication as possible, if it's possible to limit duplication especially for types and zod, etc. do it.
- We prefer early returns for errors, etc.
- Limit the number of try/except in the code, we like it readable and clean, but still maintain consitency and use them where required. 
- We like super clean typescript code where you can easily read what leads to what, don't overwhelm the reader with lots of functions and code if it can be abstracted away into a function.
- For the React `useState` you must type the value `useState<string | null>`

## Simplicity

We love simple code. Do not over-engineer or over-protect code. If another library can handle the work, use it.

**IMPORTANT:** NEVER create fallbacks without the users explicit permission. Things should fail if an issue occurs, do not do something the user does not sign off on.

## Development Commands

- Linting: `pnpm lint`
- Dev server: `pnpm dev` NEVER EVER use this unless explicitly asked to by the user. Do not enable the dev server.

## Environment Setup
1. Copy `.env.example` to `.env.local` and configure the variables found in `.env.example`

2. The app will fail gracefully if environment variables are missing (handled by `lib/env.ts`)

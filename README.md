# Aharika

Aharika is a nutrition coach for everyday Indian meals. You tell it what you ate, by typing or speaking, and it estimates calories and macros, keeps a diary, and can remind you on WhatsApp when a meal has not been logged.

It is a personal wellness tracker, not a medical service. It will not diagnose conditions or set dangerously low calorie or protein targets.

## Features

- **Landing and accounts.** A public home page, email sign-up, and sign-in. A guest trial can use one chat and up to 10 messages. Meals, goals, and reminders are saved only for a full account. Guests do not see Sign out.
- **Coach chat.** Log breakfast, lunch, dinner, or a snack in plain language. Aharika looks up foods, asks you to confirm a meal card before saving, and can edit or delete a logged meal. Diet pattern and allergies (milk, peanut, wheat, egg, plus a short note) shape the advice.
- **Voice.** Hold the microphone and speak in Hindi, English, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, or Gujarati. Sarvam turns the recording into text in the composer. Sending is a separate step.
- **Dashboard.** Today’s calories and macros against your targets, a recent history, and the meal list. Guests are sent back to chat.
- **Daily targets.** Estimate targets from age, sex, height, weight, and activity, or set them yourself. Very low calorie or protein targets are refused.
- **Coach memory and in-app nudges.** Recent meals can personalize later replies. In-chat reminders can fire when a usual meal is missing. Both can be turned off in Settings.
- **WhatsApp reminders.** A signed-in member can save a mobile number and turn on scheduled reminders (at a chosen breakfast, lunch, and dinner time) and smart reminders (only if that meal is still missing, after a 90-minute grace). Each meal is sent at most once per day. The message names the person and the meal, then links back to `/chat`.
- **Settings.** Theme, timezone, profile, tools, terms, and privacy. Storage (photos and diary export) is not built yet and is marked coming soon.
- **Feedback.** Signed-in users can send a bug, idea, or general note.

## Stack

Next.js (App Router), React, Tailwind CSS, Postgres with Drizzle, Auth.js, OpenAI for the coach, Sarvam for speech-to-text, and Twilio for WhatsApp.

## Prerequisites

- Node.js 20 or newer
- pnpm
- A Postgres database (Neon works)
- An OpenAI API key

Voice input also needs a Sarvam key. WhatsApp reminders also need a Twilio sandbox.

## Local setup

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local` (see the next section), then create the tables and load the food database:

```bash
pnpm db:setup
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

`pnpm db:setup` runs migrations and imports the food list used for meal estimates. Run `pnpm db:migrate` alone when you only need schema updates.

On Windows, `openssl` is often missing. Generate `AUTH_SECRET` and `CRON_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Use a different value for each secret.

## Environment variables

Copy `.env.example` to `.env.local`. Never commit `.env.local`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `POSTGRES_URL` | Yes | Postgres connection string. |
| `AUTH_SECRET` | Yes | Signs the session cookie. This does not authorize the reminder job. |
| `OPENAI_API_KEY` | Yes | Coach replies and chat titles. |
| `SARVAM_API_KEY` | For voice | Speech-to-text. Chat still works without it. |
| `CHAT_MODEL` | No | Overrides the default model (`openai/gpt-4.1-mini`). |
| `REDIS_URL` | No | Reserved for IP rate limiting. The limiter is not wired up yet. |
| `TWILIO_ACCOUNT_SID` | For WhatsApp | Twilio account SID. Server-side only. |
| `TWILIO_AUTH_TOKEN` | For WhatsApp | Twilio auth token. Server-side only. |
| `TWILIO_WHATSAPP_FROM` | For WhatsApp | Sandbox sender, usually `+14155238886`. |
| `TWILIO_SANDBOX_JOIN_CODE` | For WhatsApp | The sandbox join phrase, such as `join your-code`. |
| `NEXT_PUBLIC_APP_URL` | For reminders | Public site origin with no trailing slash. Locally this is `http://localhost:3000`. In production use `https://aharika.tech`. |
| `CRON_SECRET` | For the Vercel cron | Bearer secret for `GET /api/cron/whatsapp-reminders`. Must match the value stored in the host, once, not pasted twice. |

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server. |
| `pnpm build` | Run migrations, then build. The database must be reachable during the build. |
| `pnpm start` | Run the production server. On a long-running host this also starts the 15-minute reminder timer. |
| `pnpm lint` | Run ESLint. |
| `pnpm db:migrate` | Apply SQL migrations in `lib/db/migrations`. |
| `pnpm db:setup` | Migrate and import foods. |
| `pnpm db:seed-foods` | Import foods only. |
| `pnpm db:studio` | Open Drizzle Studio. |
| `pnpm exec tsx lib/nutrition/unit.test.ts` | Run the nutrition unit checks. |

## WhatsApp reminders

Reminders use the Twilio WhatsApp sandbox. A phone receives messages only after it has joined that sandbox from WhatsApp. Joins expire, and this is not a production WhatsApp Business sender.

Two reminder types:

- **Scheduled.** Sends at the saved local time even if the meal is already logged. Times are stored as 24-hour `HH:MM` and shown as a 12-hour wheel. The clock uses the timezone in Settings (default `Asia/Kolkata`).
- **Smart.** Sends only when that meal is still missing and at least 90 minutes have passed since its time. If a scheduled reminder for that meal already went out today, the smart one is skipped.

The server checks due reminders every 15 minutes. Requests without the exact `CRON_SECRET` are rejected. `AUTH_SECRET` is not used for this route.

- **Vercel Hobby.** Do not put this schedule in the Vercel project. Hobby only allows a daily cron, and that would miss most meals. After deploy, create a job at [cron-job.org](https://cron-job.org) that runs every 15 minutes:
  - URL: `https://<your-project>.vercel.app/api/cron/whatsapp-reminders`
  - Method: `GET`
  - Header: `Authorization: Bearer <CRON_SECRET>`
  - `CRON_SECRET` in Vercel must be the same value, pasted once.
  - After `aharika.tech` is valid, change the job URL to `https://aharika.tech/api/cron/whatsapp-reminders`.
- **Long-running Node server.** `pnpm start` runs the same check on boot and every 15 minutes. Restart the process after pulling this in so the timer starts.

An open chat tab can also trigger a check. The database claim makes sure the same meal is not texted twice.

## Production

Set every required variable, plus the WhatsApp variables if reminders should send, on the host. Use `https://aharika.tech` for `NEXT_PUBLIC_APP_URL` once DNS points at the deployment.

`pnpm build` migrates the database before `next build`, so `POSTGRES_URL` must be present in the build environment.

## Project layout

| Path | Contents |
| --- | --- |
| `app/` | Pages and API routes (chat, auth, nutrition, cron). |
| `components/` | Interface, including chat, dashboard, and settings. |
| `lib/nutrition/` | Meal rules, goals, safety checks, and WhatsApp scheduling. |
| `lib/db/` | Drizzle schema, queries, and migrations. |
| `lib/ai/` | Coach model and tools. |

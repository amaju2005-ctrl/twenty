# Twenty

Twenty is a trust-first career relationship discovery and outreach platform. It answers a focused question—**“Who are the 20 people I should speak to next?”**—then helps the user understand each match, choose an appropriate contact route, write a specific note, send it through Gmail, and manage the resulting conversation.

The repository is a complete, responsive MVP built for Vercel. It runs immediately in demo mode with realistic fallback data; Supabase, OpenAI, Gmail, and Hunter switch on when their environment variables are configured.

## What is included

- Passwordless authentication and route protection with Supabase Auth
- Guided CV/profile and career-goal onboarding
- Ranked people discovery with an explainable 0–100 relevance score
- Match detail pages with shared signals, career path, contact confidence, and suggested conversation angles
- Trust-aware contact states: verified, needs verification, unavailable, or warm route preferred
- AI-assisted email drafting with a safe deterministic fallback
- Gmail OAuth, review/send, encrypted tokens, reply sync, and follow-up tracking
- Outreach dashboard, reply-rate metrics, scheduled actions, and daily focus limits
- Profile, goal, integration, notification, privacy, export, and deletion settings UI
- Supabase Postgres schema, row-level security, indexes, and timestamps
- Vercel Cron endpoint that marks due follow-ups once daily
- Responsive layouts for desktop, tablet, and mobile

## Stack

- Next.js 16 App Router, React, and TypeScript
- Custom responsive CSS design system and Lucide icons
- Supabase Auth + Postgres + Row Level Security
- OpenAI Responses API for drafting
- Gmail OAuth 2.0 and Gmail API
- Hunter profile discovery and selective work-email reveal, with an optional People Data Labs fallback
- Vercel deployment and Vercel Cron

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With `NEXT_PUBLIC_DEMO_MODE=true`, the complete product is explorable without external accounts or credentials.

Production checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Configure Supabase

1. Create a Supabase project.
2. Copy the project URL, anon key, and service-role key into `.env.local`.
3. Apply `supabase/migrations/202608190001_initial.sql` in the Supabase SQL editor, or link the Supabase CLI and run `supabase db push`.
4. In **Authentication → URL Configuration**, add:
   - Local site URL: `http://localhost:3000`
   - Local redirect URL: `http://localhost:3000/auth/callback`
   - Production redirect URL: `https://YOUR_DOMAIN/auth/callback`
5. Set `NEXT_PUBLIC_DEMO_MODE=false` to require authentication on product routes.

All user-owned tables use row-level security. Gmail credentials are readable only by their owner through Supabase and are encrypted by the application before storage.

## Configure Gmail

1. Create or select a project in Google Cloud Console.
2. Enable the Gmail API.
3. Configure the OAuth consent screen. During development, add your account as a test user.
4. Create an **OAuth client ID → Web application**.
5. Add these authorized redirect URIs:
   - `http://localhost:3000/api/gmail/callback`
   - `https://YOUR_DOMAIN/api/gmail/callback`
6. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to the environment.
7. Generate a token-encryption key and set `APP_ENCRYPTION_KEY`:

```bash
openssl rand -base64 32
```

Twenty requests only identity, `gmail.send`, and `gmail.readonly`. Sending always requires a user action. Read access is used to detect replies in threads Twenty created; the MVP does not ingest the entire mailbox into its database.

## Configure AI drafting

Set `OPENAI_API_KEY`. `OPENAI_MODEL` defaults to `gpt-5-mini` and can be changed without code. The drafting prompt enforces:

- fewer than 125 words;
- one specific, low-pressure request;
- no invented familiarity or achievements;
- professional context only.

Without an API key, `/api/draft` returns a polished deterministic draft, so the UI remains functional.

## Configure live discovery and work-email lookup

Twenty does not scrape LinkedIn. It uses Hunter's professional-data API, keeps the key on the server, and makes every email reveal a deliberate user action.

1. Create a Hunter account, copy its API key, and set `HUNTER_API_KEY`.
2. Keep `NEXT_PUBLIC_DEMO_MODE=true` while testing the interface. Set it to `false` after Supabase Auth and Hunter are ready.
3. Redeploy after changing Vercel environment variables; existing deployments do not receive new values automatically.
4. Sign in, complete onboarding, open **People**, and click **Find my twenty**. That explicit click sends only target roles, industries, and locations to Hunter. CV text remains in Supabase and is used by Twenty for local relevance scoring.
5. Hunter returns masked professional results; no email credit is spent during discovery. Open one person and click **Find work email** to reveal that selected professional address. Successful and unsuccessful lookups are cached for 30 days to prevent repeated credit use.

The discovery request is capped at 20 returned profiles. Responses are normalized, scored locally, and persisted to the existing `people` and `matches` tables. Revealed Hunter results are stored in `contacts` with confidence, source, verification time, and a privacy note. Personal/free-mail addresses are discarded. `PEOPLE_DATA_LABS_API_KEY` remains supported as an optional alternative discovery source, but it is not required.

Before production use, confirm that your provider contract, privacy notice, retention rules, and target jurisdictions permit each data use. Twenty intentionally does not surface phone numbers, personal email addresses, or low-confidence contact data.

### Vercel production variables

Under **Project → Settings → Environment Variables**, configure these for Production:

```text
NEXT_PUBLIC_APP_URL=https://twenty-gamma-ten.vercel.app
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
HUNTER_API_KEY=...
# Optional alternative discovery provider:
PEOPLE_DATA_LABS_API_KEY=...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5-mini
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APP_ENCRYPTION_KEY=...
CRON_SECRET=...
```

Never place provider, OpenAI, Google, service-role, encryption, or cron secrets in `NEXT_PUBLIC_` variables, source code, screenshots, or GitHub.

## Deploy to Vercel

1. Push this directory to a new GitHub repository.
2. In Vercel, choose **Add New → Project**, import the repository, and keep the detected Next.js settings.
3. Add every production value from `.env.example` under **Project Settings → Environment Variables**.
4. Set `NEXT_PUBLIC_APP_URL` to the final HTTPS origin and `NEXT_PUBLIC_DEMO_MODE=false`.
5. Add the final Supabase and Google OAuth callback URLs described above.
6. Generate a long random `CRON_SECRET`; Vercel uses it to authenticate the daily follow-up job.
7. Deploy, then test sign-in, Gmail connection, one message to an address you control, reply sync, and account deletion before inviting users.

CLI alternative:

```bash
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_APP_URL production
vercel deploy --prod
```

## Data model

| Table | Purpose |
| --- | --- |
| `profiles` | User story, CV text, skills, and experience |
| `career_goals` | Target roles, sectors, locations, and ranking preferences |
| `people` | User-owned professional profile snapshots and source URLs |
| `matches` | Explainable score, rationale, signal breakdown, and shortlist state |
| `contacts` | Professional contact status, provenance, and verification confidence |
| `gmail_connections` | Encrypted OAuth tokens and sync cursor |
| `outreach_messages` | Draft, schedule, send, reply, and follow-up state |
| `outreach_events` | Append-only activity trail for the relationship workflow |

## Production hardening checklist

- Move high-volume discovery and ranking into a background job/queue.
- Put Gmail refresh-token encryption behind a managed KMS for larger deployments.
- Add provider-specific deletion webhooks and retention jobs.
- Add Gmail push notifications through Google Pub/Sub; the MVP exposes manual sync and stores a history cursor for this upgrade.
- Add structured audit logs and alerting for OAuth failures, provider errors, and unusual send volume.
- Complete Google OAuth verification before broad public launch.
- Add legal review for privacy notice, legitimate-interest basis, and provider licensing in every launch market.

## Product principle

Twenty is intentionally not a sequencing or mass-email tool. The default daily limit is five reviewed messages. Scores reward a credible reason to talk; contact states prefer warm routes and professional addresses; follow-ups are suggested once and never auto-sent.

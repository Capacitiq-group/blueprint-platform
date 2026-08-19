# Blueprint — Internal AI Meeting Co-Pilot & Business Intelligence Platform (V1)

Private internal platform. Not a customer-facing product. Gives an operator a
persistent, business-specific AI layer before, during and after every
business conversation — grounded strictly in each business's own knowledge,
never generic advice.

This is the **V1 core loop** as scoped by the blueprint (Section 57–58):

```
Business Profile → Knowledge Base → Meeting Setup → Live Audio →
Real-Time Transcription → Live AI Context → Stage Detection →
AI Script Suggestions → Meeting End → Summary → Actions → Follow-Up Draft
```

V2/V3 items (email/calendar/CRM integrations, self-hosted models, team
permissions, SSO) are intentionally **not** built — the blueprint itself says
not to build them yet (Section 61). The architecture doesn't block them
later; it just doesn't pretend to solve them now.

---

## 1. Architecture, and why it's built this way

| Layer | Choice | Why |
|---|---|---|
| Frontend + Backend | **Next.js 14 (App Router), TypeScript** | One codebase, one deploy. API routes (`app/api/**`) *are* the backend — there's no separate server to keep in sync. Runs on Vercel today; `next.config.js` uses `output: 'standalone'`, which produces a plain Node server you can run with `node server.js` on your own VPS later with zero code changes. |
| Database + Auth | **Supabase (Postgres + Auth)** | The single source of truth, as requested. Every table has Row Level Security — the database itself enforces that a user can only ever see businesses they're a member of, and everything scoped under a business (knowledge, contacts, meetings, transcripts, AI output) inherits that isolation. Nothing is hardcoded: business profiles, knowledge documents, meeting data — all live in Postgres, editable from the UI. |
| AI | **Kimi (Moonshot AI)**, OpenAI-compatible API | Selected via `AI_PROVIDER` env var. `lib/ai/provider.ts` is a plain interface — adding another provider (including a self-hosted model later) means adding one file under `lib/ai/providers/` and registering it in one switch statement. No other file changes. |
| Styling | **Tailwind CSS**, Intelligent Contrast palette, **Inter** | Background is always Dark Charcoal (`#0F0F0F`); surfaces use Medium Charcoal (`#202020`); the lime/forest greens are accents only, never backgrounds. See `tailwind.config.ts` and `app/globals.css`. |

The blueprint's own suggested stack was Laravel + React + Python + PocketBase.
This build uses Next.js/TypeScript end-to-end instead, for one concrete
reason relevant to your constraints: **a single Vercel-deployable codebase
with no separate services to provision, wire together, or keep in sync**,
which matters a great deal when you're developing entirely from a phone. The
`output: 'standalone'` build target means "migrate to our own VPS later" is a
hosting change, not a rewrite.

### Why Postgres full-text search instead of a vector database (V1)

The knowledge retrieval layer (`lib/ai/retrieval.ts`) uses Postgres
`tsvector`/`tsquery` full-text search over each business's knowledge
documents, not embeddings. For a founder-curated knowledge base this is
accurate, needs zero extra infrastructure, and costs nothing beyond
Postgres itself. If the knowledge base grows large enough that semantic
(not just keyword) recall starts to matter, swap the query in
`retrieveRelevantDocuments()` for a pgvector similarity search — the
function's signature and every call site stay the same.

### Prompt caching

Live meetings can trigger several AI calls in quick succession (stage
detection, script suggestions, alerts). All of them share the same
expensive-to-build prefix: the active business's full context block
(identity, positioning, commercial rules, brand voice, retrieved knowledge
documents). `lib/ai/cache.ts` caches that assembled block in-process, keyed
by business id + a content hash, and `lib/ai/prompts.ts` re-sends it as a
byte-identical prefix across calls. This cuts our own rebuild/token cost, and
because most inference APIs (including Moonshot's OpenAI-compatible
endpoint) apply their own prefix/context caching when a request's leading
content repeats verbatim, it also reduces provider-side latency and cost.
See the comments in `lib/ai/cache.ts` for how to swap it for a shared store
(Redis/Upstash) if you outgrow a single warm server instance later.

### What "live transcription" actually is in V1

The blueprint itself flags (Section 13) that capturing *another
application's* meeting/system audio is genuinely hard and depends on the
browser/environment — it explicitly says the architecture shouldn't assume
microphone capture alone solves this. V1 implements:

- Browser microphone capture + the Web Speech API (`webkitSpeechRecognition`)
  for live, on-device transcription — works in Chrome-based browsers,
  desktop and mobile.
- A manual "type what was said" fallback, always available, for browsers
  without Web Speech support (e.g. Safari/iOS) or moments recognition
  misses.
- A manual "who's speaking" toggle (You / Other party), since a single
  browser microphone stream has no built-in speaker diarization.

This is a deliberate, honest V1 scope — not a placeholder pretending to be a
full real-time multi-speaker STT pipeline. `lib/ai/prompts.ts` and the
transcript schema don't care how a transcript entry arrived, so swapping in
a dedicated streaming STT provider (Deepgram, AssemblyAI, etc.) later is a
contained change to the live meeting component, not a schema or AI-layer
change.

---

## 2. Project structure

```
blueprint/
├── app/
│   ├── (platform)/            # authenticated app shell (sidebar + all pages)
│   │   ├── dashboard/
│   │   ├── businesses/        # list, create, edit — profile, positioning, etc.
│   │   │   └── [id]/knowledge/  # per-business knowledge base (markdown docs)
│   │   └── meetings/
│   │       ├── new/           # meeting setup screen
│   │       └── [id]/live/     # live transcript + AI co-pilot
│   │       └── [id]/summary/  # post-meeting summary + follow-up draft
│   ├── api/ai/
│   │   ├── suggest/route.ts   # live stage detection + script + alerts
│   │   └── summarize/route.ts # post-meeting summary generation
│   ├── login/
│   └── layout.tsx, globals.css
├── components/
│   ├── ui/                    # Button, Field (Input/Textarea/Select/Label), Card, Badge
│   ├── layout/Sidebar.tsx
│   ├── businesses/BusinessForm.tsx
│   ├── knowledge/DocumentForm.tsx
│   └── meetings/              # MeetingSetupForm, LiveMeetingClient, SummaryView
├── lib/
│   ├── supabase/               # browser client, server client, (service-role helper)
│   ├── ai/
│   │   ├── provider.ts         # provider interface + factory (switch on AI_PROVIDER)
│   │   ├── providers/kimi.ts   # Kimi/Moonshot implementation
│   │   ├── retrieval.ts        # business-isolated knowledge search
│   │   ├── prompts.ts          # system prompt + task prompts, enforces blueprint rules
│   │   └── cache.ts            # prompt/context cache
│   ├── store/activeBusiness.ts # which business is selected, persisted client-side
│   └── types/database.ts       # hand-maintained types mirroring the SQL schema
├── middleware.ts               # protects every route except /login
├── supabase/migrations/0001_init.sql   # the entire schema — single source of truth
├── scripts/
│   ├── create-user.ts          # provision an internal user (no public sign-up)
│   └── run-migrations.ts       # applies the SQL migration via SUPABASE_DB_URL
└── .env.example
```

---

## 3. Environment variables

Copy `.env.example` to `.env.local` for local development, and set the exact
same variable names as Environment Variables in your Vercel project. Nothing
in the codebase is hardcoded — moving to your own VPS later is just setting
these same variables in the new environment.

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (keep secret — used only by `scripts/create-user.ts`) |
| `SUPABASE_DB_URL` | Supabase → Project Settings → Database → Connection string (used only by `scripts/run-migrations.ts`) |
| `AI_PROVIDER` | `kimi` (default) |
| `KIMI_API_KEY` | Moonshot AI platform |
| `KIMI_API_BASE_URL` | `https://api.moonshot.ai/v1` (default) |
| `KIMI_MODEL` | e.g. `moonshot-v1-32k` |
| `NEXT_PUBLIC_APP_URL` | your deployed URL |
| `NEXT_PUBLIC_APP_NAME` | display name, defaults to "Blueprint" |

---

## 4. Setting up the database

Run the schema once against a fresh Supabase project. Two ways — pick
whichever is easier on mobile:

**Option A — Supabase SQL Editor (simplest on mobile, no terminal needed)**
Open your Supabase project → SQL Editor → paste the entire contents of
`supabase/migrations/0001_init.sql` → Run.

**Option B — the migration script**
```
npm run db:migrate
```
Requires `SUPABASE_DB_URL` set. Re-running is safe — every statement uses
`if not exists` / `create or replace`.

## 5. Creating your first user

There is no public sign-up screen — this is a private internal platform. You
create accounts directly:

```
npm run create-user -- --email you@company.com --password "a-strong-password" --name "Your Name"
```

Or run it with no arguments and it will prompt you for each value. Requires
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. You can run this
from the Vercel deployment's environment too (see DEPLOYMENT.md) if you'd
rather not run anything locally at all.

---

## 6. Running locally (optional — you can also deploy straight to Vercel)

```
npm install
npm run dev
```

## 7. What's in scope for V1 vs later

Built now (Section 58): authentication, business profiles, knowledge base
with search and isolation, meeting setup, live transcript + AI stage
detection/script suggestions/alerts, post-meeting summary/decisions/actions/
follow-up draft.

Not built now, by design (Sections 59–61): Gmail/Outlook/Calendar/CRM
integration, automatic meeting preparation from external systems,
self-hosted model infrastructure, team permissions/SSO/MFA, autonomous
sending of anything. The schema (`business_members`, the AI provider
abstraction, the standalone Next.js build) is deliberately shaped so none of
these require a rebuild when you're ready for them — they're additions, not
migrations.

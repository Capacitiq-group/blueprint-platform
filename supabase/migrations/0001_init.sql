-- ==============================================================================
-- BLUEPRINT — V1 Database Schema
-- Internal AI Meeting Co-Pilot & Business Intelligence Platform
--
-- This is the single source of truth for all application data. Supabase
-- Postgres + Row Level Security is used instead of any application-level
-- collection store. Run this once against a fresh Supabase project via the
-- SQL Editor, or via `npm run db:migrate` (scripts/run-migrations.ts).
-- ==============================================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------------------
-- PROFILES
-- Mirrors auth.users. Created automatically by a trigger whenever a new
-- Supabase Auth user is created (see trigger at bottom of file).
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- BUSINESSES
-- Each row is one independent business profile (Section 4 of the blueprint).
-- Structured fields cover Business Identity. The remaining profile sections
-- (Products & Services, Positioning, Commercial, Operations, Brand Voice) are
-- stored as jsonb so the shape of each section can evolve without further
-- migrations, while still being fully queryable and never hardcoded.
-- ------------------------------------------------------------------------------
create table if not exists public.businesses (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users (id) on delete cascade,

  -- Business Identity
  name              text not null,
  legal_name        text,
  trading_name      text,
  website           text,
  industry          text,
  location           text,
  description       text,
  stage             text,               -- e.g. idea, early, growth, established
  target_market     text,

  -- Structured sections (Section 4) — flexible jsonb, never hardcoded
  products_services jsonb not null default '[]'::jsonb,
  positioning       jsonb not null default '{}'::jsonb,
  commercial        jsonb not null default '{}'::jsonb,
  operations        jsonb not null default '{}'::jsonb,
  brand_voice       jsonb not null default '{}'::jsonb,

  is_archived       boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists businesses_owner_id_idx on public.businesses (owner_id);

-- ------------------------------------------------------------------------------
-- BUSINESS MEMBERS
-- V1 has a single operator, but every business is modelled with membership
-- from day one so "Future Users: Internal team members" (Section 1) requires
-- no schema change later — just inserting rows.
-- ------------------------------------------------------------------------------
create table if not exists public.business_members (
  business_id  uuid not null references public.businesses (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null default 'owner' check (role in ('owner', 'member')),
  created_at   timestamptz not null default now(),
  primary key (business_id, user_id)
);

-- Helper function used throughout RLS policies below.
create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = target_business_id
      and bm.user_id = auth.uid()
  );
$$;

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;

create policy "businesses_select_member"
  on public.businesses for select
  using (public.is_business_member(id));

create policy "businesses_insert_owner"
  on public.businesses for insert
  with check (owner_id = auth.uid());

create policy "businesses_update_member"
  on public.businesses for update
  using (public.is_business_member(id));

create policy "businesses_delete_owner"
  on public.businesses for delete
  using (owner_id = auth.uid());

create policy "business_members_select_own_business"
  on public.business_members for select
  using (public.is_business_member(business_id));

create policy "business_members_insert_owner"
  on public.business_members for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

create policy "business_members_delete_owner"
  on public.business_members for delete
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

-- Automatically add the creator of a business as its owning member.
create or replace function public.handle_new_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_members (business_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_business_created on public.businesses;
create trigger on_business_created
  after insert on public.businesses
  for each row execute function public.handle_new_business();

-- ------------------------------------------------------------------------------
-- KNOWLEDGE DOCUMENTS
-- Section 5–7: Markdown knowledge base, isolated per business, searchable.
-- ------------------------------------------------------------------------------
create table if not exists public.knowledge_documents (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  category     text not null default 'general', -- company, products, services, pricing, sales, operations, policies, legal, brand, customers, competitors, processes, faq, general
  title        text not null,
  content      text not null default '',         -- markdown
  status       text not null default 'draft' check (status in ('draft', 'approved', 'outdated')),
  version      integer not null default 1,
  owner_id     uuid not null references auth.users (id),
  search       tsvector generated always as (
                 to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
               ) stored,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists knowledge_documents_business_id_idx on public.knowledge_documents (business_id);
create index if not exists knowledge_documents_search_idx on public.knowledge_documents using gin (search);

alter table public.knowledge_documents enable row level security;

create policy "knowledge_documents_select_member"
  on public.knowledge_documents for select
  using (public.is_business_member(business_id));

create policy "knowledge_documents_insert_member"
  on public.knowledge_documents for insert
  with check (public.is_business_member(business_id));

create policy "knowledge_documents_update_member"
  on public.knowledge_documents for update
  using (public.is_business_member(business_id));

create policy "knowledge_documents_delete_member"
  on public.knowledge_documents for delete
  using (public.is_business_member(business_id));

-- ------------------------------------------------------------------------------
-- CONTACTS
-- The company/person being engaged (Section 8).
-- ------------------------------------------------------------------------------
create table if not exists public.contacts (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  name         text,
  company      text,
  email        text,
  phone        text,
  linkedin     text,
  website      text,
  crm_record   text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists contacts_business_id_idx on public.contacts (business_id);

alter table public.contacts enable row level security;

create policy "contacts_all_member"
  on public.contacts for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- ------------------------------------------------------------------------------
-- MEETINGS
-- Section 8 & 12: Meeting setup + session state.
-- ------------------------------------------------------------------------------
create table if not exists public.meetings (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  contact_id     uuid references public.contacts (id) on delete set null,
  company_name   text,
  meeting_types  text[] not null default '{}',   -- multi-select, e.g. {sales, discovery}
  objective      text,
  pre_context    text,
  status         text not null default 'setup' check (status in ('setup', 'live', 'completed')),
  current_stage  text,                             -- updated live by AI stage detection
  started_at     timestamptz,
  ended_at       timestamptz,
  created_by     uuid not null references auth.users (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists meetings_business_id_idx on public.meetings (business_id);
create index if not exists meetings_status_idx on public.meetings (status);

alter table public.meetings enable row level security;

create policy "meetings_all_member"
  on public.meetings for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- ------------------------------------------------------------------------------
-- MEETING TRANSCRIPT ENTRIES
-- Section 14–15: append-only real-time transcript.
-- ------------------------------------------------------------------------------
create table if not exists public.meeting_transcript_entries (
  id          uuid primary key default gen_random_uuid(),
  meeting_id  uuid not null references public.meetings (id) on delete cascade,
  speaker     text not null default 'unknown' check (speaker in ('user', 'other', 'unknown')),
  content     text not null,
  is_final    boolean not null default true,
  spoken_at   timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists transcript_entries_meeting_id_idx on public.meeting_transcript_entries (meeting_id, spoken_at);

alter table public.meeting_transcript_entries enable row level security;

create policy "transcript_entries_all_member"
  on public.meeting_transcript_entries for all
  using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id and public.is_business_member(m.business_id)
    )
  )
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id and public.is_business_member(m.business_id)
    )
  );

-- ------------------------------------------------------------------------------
-- MEETING NOTES
-- Section 23: structured live notes, kept separate from the raw transcript.
-- ------------------------------------------------------------------------------
create table if not exists public.meeting_notes (
  id          uuid primary key default gen_random_uuid(),
  meeting_id  uuid not null references public.meetings (id) on delete cascade,
  category    text not null check (category in (
                'key_point', 'need', 'pain_point', 'question', 'objection',
                'opportunity', 'decision', 'commitment', 'risk', 'follow_up',
                'entity', 'pricing'
              )),
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists meeting_notes_meeting_id_idx on public.meeting_notes (meeting_id);

alter table public.meeting_notes enable row level security;

create policy "meeting_notes_all_member"
  on public.meeting_notes for all
  using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id and public.is_business_member(m.business_id)
    )
  )
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id and public.is_business_member(m.business_id)
    )
  );

-- ------------------------------------------------------------------------------
-- AI SUGGESTIONS
-- Section 18, 21, 22: live script suggestions, alerts and stage detections,
-- each carrying a confidence label so the operator is never falsely confident.
-- ------------------------------------------------------------------------------
create table if not exists public.ai_suggestions (
  id                uuid primary key default gen_random_uuid(),
  meeting_id        uuid not null references public.meetings (id) on delete cascade,
  type              text not null check (type in ('script', 'alert', 'stage')),
  stage             text,
  headline          text,
  content           text not null,
  reasoning         text,
  confidence        text not null default 'inferred' check (confidence in ('confirmed', 'inferred', 'unknown')),
  source_documents  jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists ai_suggestions_meeting_id_idx on public.ai_suggestions (meeting_id, created_at);

alter table public.ai_suggestions enable row level security;

create policy "ai_suggestions_all_member"
  on public.ai_suggestions for all
  using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id and public.is_business_member(m.business_id)
    )
  )
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id and public.is_business_member(m.business_id)
    )
  );

-- ------------------------------------------------------------------------------
-- MEETING SUMMARIES
-- Section 24+ / 58: post-meeting summary, decisions, actions, follow-up draft.
-- One row per meeting, generated after the meeting ends and re-generatable.
-- ------------------------------------------------------------------------------
create table if not exists public.meeting_summaries (
  id               uuid primary key default gen_random_uuid(),
  meeting_id       uuid not null unique references public.meetings (id) on delete cascade,
  summary          text,
  key_points       jsonb not null default '[]'::jsonb,
  decisions        jsonb not null default '[]'::jsonb,
  actions          jsonb not null default '[]'::jsonb,
  next_steps       jsonb not null default '[]'::jsonb,
  follow_up_draft  text,
  generated_at     timestamptz not null default now()
);

alter table public.meeting_summaries enable row level security;

create policy "meeting_summaries_all_member"
  on public.meeting_summaries for all
  using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id and public.is_business_member(m.business_id)
    )
  )
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id and public.is_business_member(m.business_id)
    )
  );

-- ------------------------------------------------------------------------------
-- Auto-create a profile row whenever a new Supabase Auth user is created.
-- This runs for users created via scripts/create-user.ts (admin API) too.
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- updated_at maintenance
-- ------------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.businesses;
create trigger set_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.knowledge_documents;
create trigger set_updated_at before update on public.knowledge_documents
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.contacts;
create trigger set_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.meetings;
create trigger set_updated_at before update on public.meetings
  for each row execute function public.set_updated_at();

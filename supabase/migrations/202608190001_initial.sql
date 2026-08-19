-- Twenty MVP schema for Supabase Postgres
create extension if not exists pgcrypto;

create type public.contact_status as enum ('verified', 'likely', 'unavailable', 'not_sought');
create type public.outreach_status as enum ('draft', 'scheduled', 'sent', 'follow_up_due', 'replied', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  headline text,
  linkedin_url text,
  cv_text text,
  location text,
  skills text[] not null default '{}',
  experience jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.career_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_summary text not null,
  target_roles text[] not null default '{}',
  industries text[] not null default '{}',
  locations text[] not null default '{}',
  company_stages text[] not null default '{}',
  preferences jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, is_active)
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_provider text,
  external_id text,
  full_name text not null,
  role_title text,
  company text,
  location text,
  headline text,
  linkedin_url text,
  profile_data jsonb not null default '{}'::jsonb,
  source_urls text[] not null default '{}',
  discovered_at timestamptz not null default now(),
  last_refreshed_at timestamptz not null default now(),
  unique nulls not distinct (user_id, external_provider, external_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  goal_id uuid references public.career_goals(id) on delete set null,
  relevance_score smallint not null check (relevance_score between 0 and 100),
  response_fit text check (response_fit in ('high', 'medium', 'selective')),
  rationale text not null,
  signals jsonb not null default '[]'::jsonb,
  score_breakdown jsonb not null default '{}'::jsonb,
  status text not null default 'suggested' check (status in ('suggested', 'saved', 'dismissed', 'contacted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, person_id, goal_id)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  status public.contact_status not null,
  work_email text,
  confidence smallint check (confidence between 0 and 100),
  source_label text,
  source_url text,
  verification_provider text,
  verified_at timestamptz,
  privacy_note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, person_id)
);

create table public.gmail_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gmail_address text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  expires_at timestamptz,
  scope text,
  history_id text,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  to_email text,
  subject text not null,
  body text not null,
  status public.outreach_status not null default 'draft',
  gmail_message_id text,
  gmail_thread_id text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  follow_up_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outreach_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  outreach_message_id uuid not null references public.outreach_messages(id) on delete cascade,
  event_type text not null check (event_type in ('drafted', 'edited', 'scheduled', 'sent', 'follow_up_due', 'reply_detected', 'call_booked', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index matches_user_score_idx on public.matches (user_id, relevance_score desc);
create index people_user_company_idx on public.people (user_id, company);
create index outreach_user_status_idx on public.outreach_messages (user_id, status, updated_at desc);
create index outreach_gmail_thread_idx on public.outreach_messages (user_id, gmail_thread_id) where gmail_thread_id is not null;
create index events_message_idx on public.outreach_events (outreach_message_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger goals_updated_at before update on public.career_goals for each row execute function public.set_updated_at();
create trigger matches_updated_at before update on public.matches for each row execute function public.set_updated_at();
create trigger contacts_updated_at before update on public.contacts for each row execute function public.set_updated_at();
create trigger gmail_connections_updated_at before update on public.gmail_connections for each row execute function public.set_updated_at();
create trigger outreach_messages_updated_at before update on public.outreach_messages for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.career_goals enable row level security;
alter table public.people enable row level security;
alter table public.matches enable row level security;
alter table public.contacts enable row level security;
alter table public.gmail_connections enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.outreach_events enable row level security;

create policy "profiles_owner_all" on public.profiles for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "goals_owner_all" on public.career_goals for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "people_owner_all" on public.people for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "matches_owner_all" on public.matches for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "contacts_owner_all" on public.contacts for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "gmail_owner_all" on public.gmail_connections for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "outreach_owner_all" on public.outreach_messages for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "events_owner_all" on public.outreach_events for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- New auth users get an empty profile row automatically.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Run this in Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/soscxohifanqklpcfuhd/sql

-- ─── PROFILES ───────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  display_name        text,
  language            text not null default 'de',
  cefr_level          text not null default 'A1',
  xp                  integer not null default 0,
  streak              integer not null default 0,
  last_active_date    date,
  onboarding_complete boolean not null default false,
  created_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can manage own profile"
  on public.profiles for all
  using (auth.uid() = id);

-- ─── WORD PROGRESS ──────────────────────────────────────────────────────────
create table if not exists public.word_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  word_id         text not null,
  language        text not null default 'de',
  correct_count   integer not null default 0,
  incorrect_count integer not null default 0,
  -- SRS (SM-2 lite)
  repetitions     integer not null default 0,
  interval_days   integer not null default 1,
  next_review_at  date not null default current_date,
  mastered        boolean not null default false,
  updated_at      timestamptz not null default now(),
  unique (user_id, word_id)
);

alter table public.word_progress enable row level security;

create policy "Users can manage own word progress"
  on public.word_progress for all
  using (auth.uid() = user_id);

-- ─── PHRASE PROGRESS ────────────────────────────────────────────────────────
create table if not exists public.phrase_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  phrase_id   text not null,
  language    text not null default 'de',
  seen        boolean not null default false,
  updated_at  timestamptz not null default now(),
  unique (user_id, phrase_id)
);

alter table public.phrase_progress enable row level security;

create policy "Users can manage own phrase progress"
  on public.phrase_progress for all
  using (auth.uid() = user_id);

-- ─── AUTO-CREATE PROFILE ON SIGNUP ──────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

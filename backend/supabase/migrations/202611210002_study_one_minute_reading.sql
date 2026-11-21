-- One-minute word reading: Part 3 of each pretest/posttest, one continuous recording scored by a teacher.
-- Sessions enrolled before this have null fluency orders and keep a two-part test.
alter table public.readlr_study_sessions
  add column if not exists pretest_fluency_order text[],
  add column if not exists posttest_fluency_order text[];

create table if not exists public.readlr_study_fluency (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references public.readlr_study_sessions(user_id) on delete cascade,
  phase text not null check (phase in ('pretest','posttest')),
  word_order text[] not null,
  started_at timestamptz,
  duration_ms int check (duration_ms between 0 and 65000),
  recording_path text,
  skipped boolean not null default false,
  words_attempted smallint check (words_attempted between 0 and 40),
  error_positions smallint[],
  words_correct smallint check (words_correct between 0 and 40),
  scored_by bigint references public.users(id) on delete set null,
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, phase),
  check (skipped or recording_path is not null)
);

-- Same policy as readlr_study_responses: only the backend (service role) can read or write.
alter table public.readlr_study_fluency enable row level security;
revoke all on public.readlr_study_fluency from public, anon, authenticated;
grant all on public.readlr_study_fluency to service_role;
-- Recordings use the existing private study-recordings bucket, streamed to admins only through the backend.

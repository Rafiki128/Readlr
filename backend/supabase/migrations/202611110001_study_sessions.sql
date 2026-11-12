-- Pretest/posttest validation study: one supervised session per consented learner.
-- Group A learns Books 1-3 (short i/e), Group B learns Books 1, 4-5 (short o/u);
-- both take the same 24-word test before and after the learning phase.
create table if not exists public.readlr_study_sessions (
  user_id bigint primary key references public.users(id) on delete cascade,
  participant_code text not null unique check (participant_code ~ '^P[0-9]{2,3}$'),
  study_group text not null check (study_group in ('A','B')),
  phase text not null default 'pretest' check (phase in ('pretest','learning','posttest','done','closed')),
  learning_minutes smallint not null default 30 check (learning_minutes between 5 and 120),
  pretest_order text[] not null,
  posttest_order text[] not null,
  learning_started_at timestamptz,
  posttest_started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.readlr_study_responses (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references public.readlr_study_sessions(user_id) on delete cascade,
  phase text not null check (phase in ('pretest','posttest')),
  word text not null,
  position smallint not null check (position between 0 and 23),
  skipped boolean not null default false,
  recording_path text,
  recording_type text,
  app_result text check (app_result in ('matched','different','uncertain','unavailable')),
  app_transcript text,
  teacher_score text check (teacher_score in ('correct','incorrect','unclear')),
  scored_by bigint references public.users(id) on delete set null,
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, phase, word),
  check (skipped or recording_path is not null)
);
create index if not exists readlr_study_responses_unscored on public.readlr_study_responses (teacher_score) where teacher_score is null;

alter table public.readlr_study_sessions enable row level security;
alter table public.readlr_study_responses enable row level security;
revoke all on public.readlr_study_sessions, public.readlr_study_responses from public, anon, authenticated;
grant all on public.readlr_study_sessions, public.readlr_study_responses to service_role;

-- Private bucket: recordings are only streamed to admins through the backend.
insert into storage.buckets (id, name, public)
values ('study-recordings', 'study-recordings', false)
on conflict (id) do nothing;

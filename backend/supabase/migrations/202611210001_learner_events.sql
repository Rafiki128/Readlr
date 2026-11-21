-- Learner session events: when a learner logs in, opens the app, or has saved progress restored.
-- No email, password, or free text is stored; detail holds only small validated values.
create table if not exists public.learner_events (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  event_type text not null check (event_type in ('login','app_open','resume')),
  occurred_at timestamptz not null default now(),
  detail jsonb
);
create index if not exists learner_events_user_time_idx on public.learner_events (user_id, occurred_at);

-- Service role only, matching curriculum_attempts.
alter table public.learner_events enable row level security;
revoke all on public.learner_events from public, anon, authenticated;
revoke all on sequence public.learner_events_id_seq from public, anon, authenticated;

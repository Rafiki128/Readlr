create table if not exists public.readlr_learner_activity (
  id uuid primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  kind text not null,
  book text not null,
  stop text not null,
  occurred_at timestamptz not null
);
create index if not exists readlr_learner_activity_user_time
  on public.readlr_learner_activity(user_id, occurred_at desc, id desc);
alter table public.readlr_learner_activity enable row level security;
revoke all on public.readlr_learner_activity from public, anon, authenticated;
grant all on public.readlr_learner_activity to service_role;

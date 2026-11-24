alter table public.readlr_learner_activity
  add column if not exists task text not null default '';

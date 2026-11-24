alter table public.readlr_study_sessions
  add column if not exists pretest_ended_early_at timestamptz;

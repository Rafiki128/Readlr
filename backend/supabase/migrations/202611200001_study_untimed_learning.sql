-- Untimed learning phase: a null learning_minutes means the admin ends learning with "Start posttest".
-- The default stays 30 so existing enrolment behaviour is unchanged.
-- Production's check was changed by hand to also allow 0 and has a row using it, so 0 stays allowed.
alter table public.readlr_study_sessions alter column learning_minutes drop not null;
alter table public.readlr_study_sessions drop constraint if exists readlr_study_sessions_learning_minutes_check;
alter table public.readlr_study_sessions add constraint readlr_study_sessions_learning_minutes_check
  check (learning_minutes is null or learning_minutes = 0 or learning_minutes between 5 and 120);

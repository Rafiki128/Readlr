alter table public.readlr_study_sessions add column if not exists entry_pending boolean not null default false;
alter table public.readlr_study_sessions add column if not exists withdrawn boolean not null default false;
update public.readlr_study_sessions s set withdrawn=true,phase='closed',entry_pending=false from public.learner_profiles p where p.user_id=s.user_id and not p.study_participant;
alter table public.readlr_study_responses drop constraint if exists readlr_study_responses_teacher_score_check;
alter table public.readlr_study_responses add constraint readlr_study_responses_teacher_score_check check (teacher_score in ('correct','incorrect','skip','unclear'));
alter table public.readlr_study_fluency add column if not exists review_status text check (review_status in ('complete','skip','unclear'));
alter table public.readlr_study_fluency add column if not exists technical_note text;
alter table public.readlr_study_sessions add column if not exists pre_check jsonb;
alter table public.readlr_study_sessions add column if not exists post_check jsonb;

-- Withdraw an assignment without deleting the evidence that was collected.
create or replace function public.readlr_withdraw_validation() returns trigger language plpgsql set search_path = public as $$
begin
  if old.study_participant and not new.study_participant then
    update readlr_study_sessions set phase='closed', withdrawn=true, entry_pending=false, updated_at=now() where user_id=new.user_id;
  end if;
  return new;
end $$;
drop trigger if exists readlr_withdraw_validation on public.learner_profiles;
create trigger readlr_withdraw_validation after update of study_participant on public.learner_profiles
for each row execute function public.readlr_withdraw_validation();
create table if not exists public.readlr_validation_events (
  id uuid primary key, user_id bigint not null references public.readlr_study_sessions(user_id) on delete cascade,
  kind text not null, book text not null, stop text not null, task text not null, occurred_at timestamptz not null default now()
);
create index if not exists readlr_validation_events_user_time on public.readlr_validation_events(user_id,occurred_at,id);
alter table public.readlr_validation_events enable row level security;
revoke all on public.readlr_validation_events from public,anon,authenticated;
grant all on public.readlr_validation_events to service_role;

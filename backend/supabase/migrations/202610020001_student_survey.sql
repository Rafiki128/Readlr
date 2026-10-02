-- Apply in the Supabase SQL editor before enabling the in-app survey.
create table if not exists public.survey_assignment (
  id integer primary key check(id=1), enabled boolean not null default false,
  overrides jsonb not null default '{}', revision integer not null default 0
);
insert into public.survey_assignment(id) values(1) on conflict do nothing;
create table if not exists public.survey_responses (
  user_id bigint references public.users(id) on delete cascade,
  version text not null, section text not null check(length(section) between 1 and 80),
  language text not null check(language in ('en','ceb')),
  answers jsonb not null check(jsonb_typeof(answers)='array' and jsonb_array_length(answers)=14),
  submitted_at timestamptz not null default now(), primary key(user_id,version)
);
create table if not exists public.survey_assignment_audit (
  id bigint generated always as identity primary key,
  actor_id bigint references public.users(id) on delete set null,
  target_user_id bigint references public.users(id) on delete set null,
  enabled boolean, created_at timestamptz not null default now()
);
alter table public.survey_assignment enable row level security;
alter table public.survey_responses enable row level security;
alter table public.survey_assignment_audit enable row level security;
revoke all on public.survey_assignment,public.survey_responses,public.survey_assignment_audit from anon,authenticated;
grant all on public.survey_assignment,public.survey_responses,public.survey_assignment_audit to service_role;
grant usage,select on sequence public.survey_assignment_audit_id_seq to service_role;

create or replace function public.assign_student_survey(p_actor bigint,p_target bigint,p_enabled boolean,p_revision integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare current_row survey_assignment;
begin
  if not exists(select 1 from users where id=p_actor and role='admin') then raise exception 'Access denied'; end if;
  if p_target is not null and not exists(select 1 from users where id=p_target and role='learner') then raise exception 'Learner not found'; end if;
  select * into current_row from survey_assignment where id=1 for update;
  if not found then raise exception 'Survey setup required'; end if;
  if current_row.revision<>p_revision then return false; end if;
  if p_target is null then
    if p_enabled is null then raise exception 'Class assignment required'; end if;
    update survey_assignment set enabled=p_enabled,revision=revision+1 where id=1;
  else
    update survey_assignment set overrides=case when p_enabled is null then overrides-p_target::text else jsonb_set(overrides,array[p_target::text],to_jsonb(p_enabled)) end,revision=revision+1 where id=1;
  end if;
  insert into survey_assignment_audit(actor_id,target_user_id,enabled) values(p_actor,p_target,p_enabled);
  return true;
end $$;

create or replace function public.submit_student_survey(p_user bigint,p_version text,p_section text,p_language text,p_answers jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
declare assignment survey_assignment; answer jsonb; i integer;
begin
  if not exists(select 1 from users where id=p_user and role='learner') then raise exception 'Access denied'; end if;
  select * into assignment from survey_assignment where id=1 for share;
  if not found or not coalesce((assignment.overrides->>p_user::text)::boolean,assignment.enabled,false) then return false; end if;
  if p_version<>'student-feedback-5star-v1' or p_language not in ('en','ceb') or length(trim(p_section)) not between 1 and 80 or jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)<>14 then raise exception 'Invalid survey'; end if;
  for i in 0..13 loop
    answer:=p_answers->i;
    if answer <> 'null'::jsonb then
      if i<12 then
        if answer not in ('1'::jsonb,'2'::jsonb,'3'::jsonb,'4'::jsonb,'5'::jsonb) then raise exception 'Invalid rating'; end if;
      elsif i=12 then
        if answer not in ('"characters"'::jsonb,'"games"'::jsonb,'"sounds"'::jsonb,'"reading"'::jsonb,'"pictures"'::jsonb,'"rewards"'::jsonb) then raise exception 'Invalid choice'; end if;
      elsif answer not in ('"nothing"'::jsonb,'"games"'::jsonb,'"sounds"'::jsonb,'"reading"'::jsonb,'"pictures"'::jsonb,'"rewards"'::jsonb) then raise exception 'Invalid choice'; end if;
    end if;
  end loop;
  -- A retry never duplicates or overwrites an already submitted questionnaire.
  insert into survey_responses(user_id,version,section,language,answers) values(p_user,p_version,trim(p_section),p_language,p_answers) on conflict do nothing;
  return true;
end $$;
revoke all on function public.assign_student_survey(bigint,bigint,boolean,integer),public.submit_student_survey(bigint,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.assign_student_survey(bigint,bigint,boolean,integer),public.submit_student_survey(bigint,text,text,text,jsonb) to service_role;

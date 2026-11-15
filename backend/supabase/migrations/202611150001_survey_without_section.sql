-- Learners no longer type a section; earlier responses keep the section they entered.
alter table public.survey_responses alter column section drop not null;
alter table public.survey_responses drop constraint if exists survey_responses_section_check;
alter table public.survey_responses add constraint survey_responses_section_check check(section is null or length(section) between 1 and 80);

-- The old 5-argument function stays so the backend already deployed keeps working; drop it in a later migration.
create or replace function public.submit_student_survey(p_user bigint,p_version text,p_language text,p_answers jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
declare assignment survey_assignment; answer jsonb; i integer;
begin
  if not exists(select 1 from users where id=p_user and role='learner') then raise exception 'Access denied'; end if;
  select * into assignment from survey_assignment where id=1 for share;
  if not found or not coalesce((assignment.overrides->>p_user::text)::boolean,assignment.enabled,false) then return false; end if;
  if p_version<>'student-feedback-5star-v1' or p_language not in ('en','ceb') or jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)<>14 then raise exception 'Invalid survey'; end if;
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
  insert into survey_responses(user_id,version,language,answers) values(p_user,p_version,p_language,p_answers) on conflict do nothing;
  return true;
end $$;
revoke all on function public.submit_student_survey(bigint,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.submit_student_survey(bigint,text,text,jsonb) to service_role;

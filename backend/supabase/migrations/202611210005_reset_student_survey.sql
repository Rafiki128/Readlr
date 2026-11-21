-- Admins can remove a submitted survey so a learner can complete it again.
create or replace function public.reset_student_survey(p_actor bigint,p_target bigint)
returns integer language plpgsql security definer set search_path=public as $$
declare removed integer:=0;
begin
  if not exists(select 1 from users where id=p_actor and role='admin') then
    raise exception 'Access denied';
  end if;
  if p_target is not null and not exists(select 1 from users where id=p_target and role='learner') then
    raise exception 'Learner not found';
  end if;
  if p_target is null then
    delete from survey_responses;
  else
    delete from survey_responses where user_id=p_target;
  end if;
  get diagnostics removed=row_count;
  return removed;
end $$;

revoke all on function public.reset_student_survey(bigint,bigint) from public,anon,authenticated;
grant execute on function public.reset_student_survey(bigint,bigint) to service_role;

-- A full learning-progress reset also clears completed book stops. Guided activity
-- details and rewards remain available for the learner and teacher.
create or replace function public.reset_learning_progress(p_actor bigint,p_target bigint,p_stages integer[])
returns integer language plpgsql security invoker set search_path=public as $$
declare l record; s integer; stage_key bigint; before_count integer; next_epoch integer; affected integer:=0;
begin
 if not exists(select 1 from users where id=p_actor and role='admin') then raise exception 'Admin required'; end if;
 if cardinality(p_stages) not between 1 and 3 or p_stages is null or
    exists(select 1 from unnest(p_stages) v where v is null or v not between 1 and 3) then raise exception 'Invalid stages'; end if;
 if p_target is not null and not exists(select 1 from users where id=p_target and role='learner') then raise exception 'Learner required'; end if;
 for l in select lp.id from learner_profiles lp join users u on u.id=lp.user_id
   where u.role='learner' and (p_target is null or u.id=p_target) order by lp.id loop
   for s in select distinct v from unnest(p_stages) v order by v loop
     select id into strict stage_key from stages where stage_number=s;
     insert into learner_stage_state(learner_id,stage_number) values(l.id,s) on conflict do nothing;
     perform 1 from learner_stage_state where learner_id=l.id and stage_number=s for update;
     select greatest(coalesce((select completed_levels from progress where learner_id=l.id and stage_id=stage_key),0),
       coalesce((select completed from reading_journeys where learner_id=l.id and stage_number=s),0)) into before_count;
     update learner_stage_state set epoch=epoch+1,earned_completed=greatest(earned_completed,least(20,before_count))
       where learner_id=l.id and stage_number=s returning epoch into next_epoch;
     update progress set completed_levels=0,completion_percentage=0,journey=null,last_updated=now()
       where learner_id=l.id and stage_id=stage_key;
     update reading_journeys set completed=0,jewels=0,updated_at=now() where learner_id=l.id and stage_number=s;
     insert into progress_reset_audit(actor_id,learner_id,stage_number,previous_completed,epoch)
       values(p_actor,l.id,s,before_count,next_epoch);
   end loop;
   if p_stages @> array[1,2,3]::integer[] then
     update learner_curriculum_state set guided_stops='{}',carousel_focus=0,updated_at=now()
       where learner_id=l.id;
   end if;
   affected:=affected+1;
 end loop;
 return affected;
end $$;
revoke all on function public.reset_learning_progress(bigint,bigint,integer[]) from public,anon,authenticated;
grant execute on function public.reset_learning_progress(bigint,bigint,integer[]) to service_role;

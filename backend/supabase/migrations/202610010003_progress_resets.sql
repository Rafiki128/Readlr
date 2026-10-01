-- Apply before deploying reset-aware clients and backend.
-- Reward high-water marks survive resets; epochs reject stale offline writes.
create table if not exists public.learner_stage_state (
  learner_id bigint not null references public.learner_profiles(id) on delete cascade,
  stage_number integer not null check (stage_number between 1 and 3),
  epoch integer not null default 0,
  earned_completed integer not null default 0 check (earned_completed between 0 and 20),
  primary key (learner_id, stage_number)
);
create table if not exists public.progress_reset_audit (
  id bigint generated always as identity primary key,
  actor_id bigint not null references public.users(id),
  learner_id bigint not null references public.learner_profiles(id),
  stage_number integer not null,
  previous_completed integer not null,
  epoch integer not null,
  created_at timestamptz not null default now()
);
alter table public.learner_stage_state enable row level security;
alter table public.progress_reset_audit enable row level security;
revoke all on public.learner_stage_state, public.progress_reset_audit from anon, authenticated;
grant all on public.learner_stage_state, public.progress_reset_audit to service_role;
grant usage, select on sequence public.progress_reset_audit_id_seq to service_role;

insert into public.learner_stage_state(learner_id, stage_number, earned_completed)
select l.id, s.stage_number, least(20, greatest(coalesce(p.completed_levels,0),coalesce(j.completed,0)))
from public.learner_profiles l cross join public.stages s
left join public.progress p on p.learner_id=l.id and p.stage_id=s.id
left join public.reading_journeys j on j.learner_id=l.id and j.stage_number=s.stage_number
where s.stage_number between 1 and 3
on conflict (learner_id,stage_number) do update set earned_completed=greatest(learner_stage_state.earned_completed,excluded.earned_completed);

create or replace function public.sync_stage_guarded(
 p_learner bigint, p_stage integer, p_completed integer, p_jewels integer,
 p_epoch integer, p_total integer default 20, p_journey jsonb default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare guard learner_stage_state; stage_key bigint; saved progress; j reading_journeys;
begin
 if p_stage is null or p_completed is null or p_epoch is null or p_total is null or
    p_stage not between 1 and 3 or p_completed not between 0 and 20 or p_total <> 20 or p_epoch < 0 then
   raise exception 'Invalid progress';
 end if;
 insert into learner_stage_state(learner_id,stage_number) values(p_learner,p_stage) on conflict do nothing;
 select * into strict guard from learner_stage_state where learner_id=p_learner and stage_number=p_stage for update;
 if guard.epoch <> p_epoch then raise exception 'STALE_PROGRESS_EPOCH'; end if;
 select id into strict stage_key from stages where stage_number=p_stage;
 if p_stage in (2,3) then
   select * into j from sync_reading_journey(p_learner,p_stage,p_completed,p_jewels);
 else
   insert into progress(learner_id,stage_id,completed_levels,total_levels,completion_percentage)
   values(p_learner,stage_key,p_completed,20,p_completed*5)
   on conflict (learner_id,stage_id) do update set
     completed_levels=greatest(progress.completed_levels,excluded.completed_levels),
     total_levels=20, completion_percentage=greatest(progress.completed_levels,excluded.completed_levels)*5,
     last_updated=now();
 end if;
 select * into strict saved from progress where learner_id=p_learner and stage_id=stage_key;
 update learner_stage_state set earned_completed=greatest(earned_completed,saved.completed_levels)
 where learner_id=p_learner and stage_number=p_stage;
 return jsonb_build_object('progress',to_jsonb(saved),'journey',to_jsonb(j));
end $$;

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
   affected:=affected+1;
 end loop;
 return affected;
end $$;
revoke all on function public.sync_stage_guarded(bigint,integer,integer,integer,integer,integer,jsonb) from public,anon,authenticated;
revoke all on function public.reset_learning_progress(bigint,bigint,integer[]) from public,anon,authenticated;
grant execute on function public.sync_stage_guarded(bigint,integer,integer,integer,integer,integer,jsonb) to service_role;
grant execute on function public.reset_learning_progress(bigint,bigint,integer[]) to service_role;

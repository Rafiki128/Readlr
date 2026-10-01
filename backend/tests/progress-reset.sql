-- Run ONLY against an empty disposable PostgreSQL database with psql -v ON_ERROR_STOP=1.
do $$ begin
 if not exists(select from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;
create table users(id bigint primary key, role text);
create table learner_profiles(id bigint primary key,user_id bigint references users);
create table stages(id bigint primary key,stage_number integer unique);
create table progress(id bigint generated always as identity,learner_id bigint,stage_id bigint,
 completed_levels integer default 0,total_levels integer,completion_percentage integer default 0,
 last_updated timestamptz default now(),journey jsonb,unique(learner_id,stage_id));
create table frames(id bigint primary key,unlock_stage_id bigint);
create table user_unlocked_frames(user_id bigint,frame_id bigint,unique(user_id,frame_id));
insert into users values(1,'admin'),(2,'learner'),(3,'learner');
insert into learner_profiles values(20,2),(30,3);
insert into stages values(101,1),(102,2),(103,3);
insert into frames values(1,101);
insert into user_unlocked_frames values(2,1);
\ir ../supabase/migrations/202609250106_reading_journeys.sql
select sync_reading_journey(20,2,20,0);
select sync_reading_journey(20,3,20,3);
insert into progress(learner_id,stage_id,completed_levels,total_levels,completion_percentage) values(20,101,20,20,100);
\ir ../supabase/migrations/202610010003_progress_resets.sql
do $$
declare result jsonb;
begin
 if (select earned_completed from learner_stage_state where learner_id=20 and stage_number=2) <> 20 then raise exception 'Backfill failed'; end if;
 perform reset_learning_progress(1,2,array[2]);
 if (select completed_levels from progress where learner_id=20 and stage_id=102) <> 0 then raise exception 'Reset failed'; end if;
 if (select completed from reading_journeys where learner_id=20 and stage_number=3) <> 20 then raise exception 'Unselected stage changed'; end if;
 if (select earned_completed from learner_stage_state where learner_id=20 and stage_number=2) <> 20 then raise exception 'Reward lost'; end if;
 begin
   perform sync_stage_guarded(20,2,20,0,0);
   raise exception 'Stale client accepted';
 exception when raise_exception then
   if sqlerrm <> 'STALE_PROGRESS_EPOCH' then raise; end if;
 end;
 result := sync_stage_guarded(20,2,1,0,1);
 if result->'journey'->>'completed' <> '1' then raise exception 'Fresh progress failed'; end if;
 perform reset_learning_progress(1,null,array[1,2,3]);
 if exists(select 1 from progress where completed_levels <> 0) then raise exception 'Class reset failed'; end if;
 if (select count(*) from learner_stage_state where learner_id=30 and epoch=1) <> 3 then raise exception 'Empty profiles not reset'; end if;
 if (select count(*) from user_unlocked_frames) <> 1 then raise exception 'Frames lost'; end if;
 if (select count(*) from learner_stage_state where learner_id=20 and earned_completed=20) <> 3 then raise exception 'Rewards lost after class reset'; end if;
 if (select count(*) from progress_reset_audit) <> 7 then raise exception 'Audit missing'; end if;
 begin
   perform reset_learning_progress(2,null,array[1]);
   raise exception 'Learner allowed reset';
 exception when raise_exception then
   if sqlerrm <> 'Admin required' then raise; end if;
 end;
 begin
   perform sync_stage_guarded(20,1,20,0,0);
   raise exception 'Stale Valley accepted';
 exception when raise_exception then
   if sqlerrm <> 'STALE_PROGRESS_EPOCH' then raise; end if;
 end;
end $$;

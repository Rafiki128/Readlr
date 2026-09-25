-- Versioned progress for the expanded Stage 2/3 curriculum. Legacy totals stay separate.
create table if not exists public.reading_journeys (
  learner_id bigint not null references public.learner_profiles(id) on delete cascade,
  stage_number integer not null check (stage_number in (2,3)),
  completed integer not null default 0 check (completed between 0 and 20),
  jewels integer not null default 0 check (jewels between 0 and 3),
  updated_at timestamptz not null default now(),
  primary key (learner_id, stage_number)
);
alter table public.reading_journeys enable row level security;

-- An atomic max prevents an older device or a retried request from erasing progress.
create or replace function public.sync_reading_journey(p_learner bigint, p_stage integer, p_completed integer, p_jewels integer)
returns setof public.reading_journeys
language plpgsql security invoker set search_path = public as $$
declare saved public.reading_journeys; stage_key bigint;
begin
  if p_stage not in (2,3) or p_completed not between 0 and 20 or p_jewels not between 0 and 3
     or (p_stage = 2 and p_jewels <> 0)
     or (p_stage = 3 and ((p_completed < 19 and p_jewels <> 0) or (p_completed = 20 and p_jewels <> 3) or (p_completed < 20 and p_jewels = 3))) then
    raise exception 'Invalid reading journey';
  end if;
  select id into strict stage_key from public.stages where stage_number = p_stage;
  insert into public.reading_journeys (learner_id, stage_number, completed, jewels)
    values (p_learner, p_stage, p_completed, p_jewels)
    on conflict (learner_id, stage_number) do update set
      completed = greatest(reading_journeys.completed, excluded.completed),
      jewels = greatest(reading_journeys.jewels, excluded.jewels), updated_at = now()
    returning * into saved;
  insert into public.progress (learner_id, stage_id, completed_levels, total_levels, completion_percentage)
    values (p_learner, stage_key, saved.completed, 20, saved.completed * 5)
    on conflict (learner_id, stage_id) do update set completed_levels = saved.completed,
      total_levels = 20, completion_percentage = saved.completed * 5, last_updated = now();
  return next saved;
end;
$$;
revoke all on function public.sync_reading_journey(bigint,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.sync_reading_journey(bigint,integer,integer,integer) to service_role;

-- Existing Valley completions also receive frames when this feature is installed later.
insert into public.user_unlocked_frames (user_id, frame_id)
select l.user_id, f.id from public.progress p
join public.learner_profiles l on l.id = p.learner_id
join public.stages s on s.id = p.stage_id and s.stage_number = 1
join public.frames f on f.unlock_stage_id = s.id
where p.completed_levels >= 20 and p.total_levels = 20
on conflict (user_id, frame_id) do nothing;

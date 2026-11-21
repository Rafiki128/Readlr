-- Granular account resets for one reading book or one challenge stop.
create or replace function public.reset_reading_progress_granular(
  p_actor bigint,
  p_target bigint,
  p_scope text,
  p_chapter text default null,
  p_stop text default null
)
returns integer language plpgsql security invoker set search_path=public as $$
declare l record; affected integer:=0; stop_id text; legacy_stop text;
begin
  if not exists(select 1 from users where id=p_actor and role='admin') then
    raise exception 'Admin required';
  end if;
  if p_scope not in ('book','challenge') then raise exception 'Invalid reset scope'; end if;
  if p_chapter is null or p_chapter not in ('gate','lanterns','market','garden','bridge','hall','keys','library','tower','crown') then
    raise exception 'Invalid chapter';
  end if;
  if p_scope='challenge' and p_stop is null then raise exception 'Invalid stop'; end if;
  if p_target is not null and not exists(select 1 from users where id=p_target and role='learner') then
    raise exception 'Learner required';
  end if;

  for l in select lp.id from learner_profiles lp join users u on u.id=lp.user_id
    where u.role='learner' and (p_target is null or u.id=p_target) order by lp.id loop
    if p_scope='book' then
      update learner_curriculum_state
        set guided_stops=coalesce(array(select value from unnest(guided_stops) value
          where value not like p_chapter||':%' and not (p_chapter='gate' and value in ('mango','apple','top','blend','games','check','gate:mango','gate:apple','gate:top','gate:blend','gate:games','gate:check'))),'{}'),
            updated_at=now()
        where learner_id=l.id;
      delete from reading_checkpoints where learner_id=l.id and chapter_id=p_chapter;
    else
      stop_id:=p_chapter||':'||p_stop;
      update learner_curriculum_state
        set guided_stops=coalesce(array(select value from unnest(guided_stops) value
          where value<>stop_id and not (p_chapter='gate' and p_stop in ('mango','apple','top') and value=p_stop)), '{}'),
            updated_at=now()
        where learner_id=l.id;
      if p_stop='check' then
        delete from reading_checkpoints where learner_id=l.id and chapter_id=p_chapter;
      end if;
    end if;
    affected:=affected+1;
  end loop;
  return affected;
end $$;

revoke all on function public.reset_reading_progress_granular(bigint,bigint,text,text,text) from public,anon,authenticated;
grant execute on function public.reset_reading_progress_granular(bigint,bigint,text,text,text) to service_role;

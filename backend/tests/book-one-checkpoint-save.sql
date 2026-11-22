-- Run against a disposable database with the checkpoint migrations installed.
begin;
insert into users (email,password_hash,role) values ('checkpoint-test@example.invalid','test','learner');
insert into learner_profiles (user_id,name)
select id,'Checkpoint test' from users where email='checkpoint-test@example.invalid';

do $$
declare learner bigint; round_id uuid; saved jsonb; final_result jsonb;
begin
  select p.id into strict learner from learner_profiles p join users u on u.id=p.user_id
    where u.email='checkpoint-test@example.invalid';
  insert into learner_stage_state(learner_id,stage_number) values(learner,3);
  insert into curriculum_releases(curriculum_version,media_manifest_version,status,curriculum_sha256,manifest_sha256,approved_by,approval_reference,approved_at)
    values('checkpoint-test','checkpoint-test','approved',repeat('0',64),repeat('0',64),'test','test',now());

  -- Exercise the normal write and retry independently.
  for scenario in 1..3 loop
    round_id:=gen_random_uuid();
    insert into reading_checkpoints(id,learner_id,curriculum_version,media_manifest_version,chapter_id,epoch,words,results)
      values(round_id,learner,'checkpoint-test','checkpoint-test','gate',0,array['am','at','mat'],
        case when scenario=2 then '{"0":"matched","1":"matched","2":"different"}'::jsonb
          else '{"0":"matched","1":"matched"}'::jsonb end);
    if scenario=2 then
      saved:=retry_reading_checkpoint(learner,round_id,2,'matched');
    else
      saved:=record_reading_checkpoint(learner,round_id,2,'matched');
    end if;
    if saved->'results'->>'2' is distinct from 'matched'
      or saved->>'passed' is distinct from 'false' or saved->>'completed_at' is not null then
      raise exception 'Word should be saved without completing the checkpoint: %',saved;
    end if;

    final_result:=record_reading_checkpoint_meaning(learner,round_id,case when scenario=3 then 'top' else 'mat' end);
    if final_result->>'completed_at' is null or (final_result->>'passed')::boolean is distinct from (scenario<>3) then
      raise exception 'Picture choice should finalize the checkpoint with the correct pass status: %',final_result;
    end if;
  end loop;
end $$;
rollback;

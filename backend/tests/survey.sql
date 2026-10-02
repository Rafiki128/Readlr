-- Disposable local database only.
create table users(id bigint primary key,role text);
insert into users values(1,'admin'),(2,'learner'),(3,'learner');
\ir ../supabase/migrations/202610020001_student_survey.sql
do $$ declare answers jsonb:='[1,2,3,4,5,null,1,2,3,4,5,1,"games","nothing"]'; begin
 if submit_student_survey(2,'student-feedback-5star-v1','A','en',answers) then raise exception 'Default enabled';end if;
 begin perform assign_student_survey(2,null,true,0);raise exception 'Learner assigned';exception when raise_exception then if sqlerrm<>'Access denied' then raise;end if;end;
 if not assign_student_survey(1,null,true,0) then raise exception 'Class failed';end if;
 if assign_student_survey(1,null,false,0) then raise exception 'Stale write';end if;
 perform assign_student_survey(1,3,false,1);
 if submit_student_survey(3,'student-feedback-5star-v1','A','en',answers) then raise exception 'Override ignored';end if;
 if not submit_student_survey(2,'student-feedback-5star-v1','A','en',answers) then raise exception 'Submission failed';end if;
 perform submit_student_survey(2,'student-feedback-5star-v1','B','ceb',answers);
 if (select count(*) from survey_responses)<>1 or (select section from survey_responses where user_id=2)<>'A' then raise exception 'Retry overwrote response';end if;
 perform assign_student_survey(1,null,false,2);
 if (select count(*) from survey_responses)<>1 then raise exception 'Hiding deleted responses';end if;
 perform assign_student_survey(1,3,true,3);
 begin perform submit_student_survey(3,'student-feedback-5star-v1','A','en','[6,2,3,4,5,null,1,2,3,4,5,1,"games","nothing"]');raise exception 'Invalid accepted';exception when raise_exception then if sqlerrm<>'Invalid rating' then raise;end if;end;
 if not submit_student_survey(3,'student-feedback-5star-v1','A','ceb','[null,null,null,null,null,null,null,null,null,null,null,null,null,null]') then raise exception 'Skips failed';end if;
 if has_table_privilege('anon','survey_responses','select') or has_function_privilege('authenticated','assign_student_survey(bigint,bigint,boolean,integer)','execute') then raise exception 'Public access';end if;
end $$;

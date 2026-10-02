-- Only run on a disposable, empty test database. Never on the application database.
create table users(id bigint primary key,email text unique,role text,password_hash text);
insert into users values(1,'admin@test.com','admin','original'),(2,'child@test.com','learner','original');
\ir ../supabase/migrations/202610010004_password_recovery.sql
do $$ declare ticket uuid:='00000000-0000-4000-8000-000000000001'; begin
 perform request_password_recovery('absent@test.com',ticket,'secret');
 if exists(select from password_recovery) then raise exception 'Unknown account inserted';end if;
 perform request_password_recovery('child@test.com',ticket,'secret');
 perform request_password_recovery('child@test.com','00000000-0000-4000-8000-000000000002','other');
 if (select count(*) from password_recovery)<>1 then raise exception 'Cooldown failed';end if;
 begin
   perform approve_password_recovery(2,ticket,'code');raise exception 'Learner allowed approval';
 exception when raise_exception then if sqlerrm<>'Admin required' then raise;end if;end;
 if complete_password_recovery(ticket,'secret','code','new') then raise exception 'Pending request accepted';end if;
 if not approve_password_recovery(1,ticket,'code') then raise exception 'Approval failed';end if;
 if approve_password_recovery(1,ticket,'newcode') then raise exception 'Duplicate approval accepted';end if;
 if complete_password_recovery(ticket,'wrong','code','new') then raise exception 'Wrong browser accepted';end if;
 if complete_password_recovery(ticket,'secret','wrong','new') then raise exception 'Wrong code accepted';end if;
 if not complete_password_recovery(ticket,'secret','code','new') then raise exception 'Valid code failed';end if;
 if complete_password_recovery(ticket,'secret','code','again') then raise exception 'Code reused';end if;
 if (select auth_version from users where id=2)<>1 then raise exception 'Sessions not revoked';end if;
 if (select password_hash from users where id=2)<>'new' then raise exception 'Password not changed';end if;
 update password_recovery set created_at=now()-interval '1 hour';
 ticket:='00000000-0000-4000-8000-000000000003';
 perform request_password_recovery('child@test.com',ticket,'secret');
 perform approve_password_recovery(1,ticket,'code');
 for i in 1..5 loop perform complete_password_recovery(ticket,'secret','wrong','no');end loop;
 if complete_password_recovery(ticket,'secret','code','no') then raise exception 'Attempt limit bypassed';end if;
 update password_recovery set attempts=0,expires_at=now()-interval '1 second' where id=ticket;
 if complete_password_recovery(ticket,'secret','code','no') then raise exception 'Expired code accepted';end if;
end $$;

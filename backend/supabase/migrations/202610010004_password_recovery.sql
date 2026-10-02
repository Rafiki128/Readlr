-- Apply before deploying the recovery-aware backend (authentication needs auth_version).
-- Admins verify identity in person and match the browser request ID, then give the
-- one-time code to that learner. No email delivery or automatic approval is used.
-- Pending: 24 hours. Approved code: 15 minutes, five attempts, single use.
-- Request cooldown: 15 minutes per account. Use HTTPS and edge rate limits.
-- Never log recovery request bodies or expose this table to public API roles.
alter table public.users add column if not exists auth_version integer not null default 0;
create table if not exists public.password_recovery (
 id uuid primary key,
 user_id bigint not null references public.users(id) on delete cascade,
 request_hash text not null,
 code_hash text,
 status text not null default 'pending' check(status in ('pending','approved','used','rejected')),
 attempts integer not null default 0,
 actor_id bigint references public.users(id) on delete set null,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '24 hours'
);
create index if not exists recovery_user_created on public.password_recovery(user_id,created_at desc);
alter table public.password_recovery enable row level security;
revoke all on public.password_recovery from anon,authenticated;
grant all on public.password_recovery to service_role;

create or replace function public.request_password_recovery(p_email text,p_id uuid,p_hash text)
returns void language plpgsql security invoker set search_path=public as $$
declare u users;
begin
 select * into u from users where email=p_email and role='learner' for update;
 if not found then return; end if;
 if exists(select 1 from password_recovery where user_id=u.id and created_at>now()-interval '15 minutes') then return; end if;
 insert into password_recovery(id,user_id,request_hash) values(p_id,u.id,p_hash);
end $$;

create or replace function public.approve_password_recovery(p_actor bigint,p_id uuid,p_code text,p_reject boolean default false)
returns boolean language plpgsql security invoker set search_path=public as $$
begin
 if not exists(select 1 from users where id=p_actor and role='admin') then raise exception 'Admin required'; end if;
 update password_recovery set status=case when p_reject then 'rejected' else 'approved' end,
   actor_id=p_actor,code_hash=case when p_reject then null else p_code end,expires_at=now()+interval '15 minutes'
 where id=p_id and status='pending' and expires_at>now();
 return found;
end $$;

create or replace function public.complete_password_recovery(p_id uuid,p_request text,p_code text,p_password text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare r password_recovery; learner bigint;
begin
 select user_id into learner from password_recovery where id=p_id and request_hash=p_request;
 if not found then return false; end if;
 -- Serialize all recovery requests for an account before consuming any code.
 perform 1 from users where id=learner and role='learner' for update;
 if not found then return false; end if;
 select * into r from password_recovery where id=p_id for update;
 if r.status<>'approved' or r.expires_at<=now() or r.attempts>=5 then return false; end if;
 if r.code_hash<>p_code then
   update password_recovery set attempts=attempts+1 where id=p_id;
   return false;
 end if;
 update users set password_hash=p_password,auth_version=auth_version+1 where id=learner;
 update password_recovery set status=case when id=p_id then 'used' else 'rejected' end,code_hash=null
 where user_id=learner and status in ('pending','approved');
 return true;
end $$;
revoke all on function public.request_password_recovery(text,uuid,text) from public,anon,authenticated;
revoke all on function public.approve_password_recovery(bigint,uuid,text,boolean) from public,anon,authenticated;
revoke all on function public.complete_password_recovery(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.request_password_recovery(text,uuid,text),public.approve_password_recovery(bigint,uuid,text,boolean),public.complete_password_recovery(uuid,text,text,text) to service_role;

create table if not exists public.classroom_control (
  id integer primary key check (id = 1),
  policy jsonb not null default '{"mode":"open","stage":null,"message":"","surveyUrl":""}',
  overrides jsonb not null default '{}',
  revision integer not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.classroom_control(id) values (1) on conflict do nothing;
create table if not exists public.classroom_control_audit (
  id bigint generated always as identity primary key,
  actor_id bigint references public.users(id) on delete set null,
  target_user_id bigint references public.users(id) on delete set null,
  revision integer not null,
  previous_policy jsonb,
  new_policy jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.learner_presence (
  user_id bigint primary key references public.users(id) on delete cascade,
  stage integer check (stage between 1 and 3),
  level integer check (level between 1 and 20),
  screen text not null,
  last_seen timestamptz not null default now()
);
alter table public.classroom_control enable row level security;
alter table public.classroom_control_audit enable row level security;
alter table public.learner_presence enable row level security;
revoke all on public.classroom_control,public.classroom_control_audit,public.learner_presence from anon,authenticated;
grant all on public.classroom_control,public.classroom_control_audit,public.learner_presence to service_role;
grant usage,select on sequence public.classroom_control_audit_id_seq to service_role;

create or replace function public.set_classroom_control(p_actor bigint,p_revision integer,p_target bigint,p_policy jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_row classroom_control; previous jsonb;
begin
  if not exists(select 1 from users where id=p_actor and role='admin') then raise exception 'Access denied'; end if;
  if p_target is not null and not exists(select 1 from users where id=p_target and role='learner') then raise exception 'Learner not found'; end if;
  select * into current_row from classroom_control where id=1 for update;
  if not found then raise exception 'Classroom setup required'; end if;
  if current_row.revision <> p_revision then return false; end if;
  if p_target is null then
    if p_policy is null then raise exception 'Class policy required'; end if;
    previous := current_row.policy;
    update classroom_control set policy=p_policy,revision=revision+1,updated_at=now() where id=1;
  else
    previous := current_row.overrides->p_target::text;
    update classroom_control set overrides=case when p_policy is null then overrides-p_target::text
      else jsonb_set(overrides,array[p_target::text],p_policy) end,revision=revision+1,updated_at=now() where id=1;
  end if;
  insert into classroom_control_audit(actor_id,target_user_id,revision,previous_policy,new_policy)
    values(p_actor,p_target,p_revision+1,previous,p_policy);
  return true;
end $$;
revoke all on function public.set_classroom_control(bigint,integer,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.set_classroom_control(bigint,integer,bigint,jsonb) to service_role;

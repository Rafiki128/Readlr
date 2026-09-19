-- Run this after the initial schema migration. Public registration remains
-- learner-only; promote only trusted team accounts to admin manually.

alter table public.users
  drop constraint users_role_check,
  add constraint users_role_check check (role in ('learner', 'teacher', 'admin'));

-- Replace the email below with a trusted existing team account after it signs up.
-- update public.users set role = 'admin' where email = 'you@yourdomain.com';

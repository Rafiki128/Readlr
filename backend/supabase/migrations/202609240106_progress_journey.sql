-- Run this migration in the Supabase SQL Editor, or with `supabase db push`.
-- Stores the full Blending Bridges and CVC Kingdom journey so learners resume on any device.

alter table public.progress add column if not exists journey jsonb;

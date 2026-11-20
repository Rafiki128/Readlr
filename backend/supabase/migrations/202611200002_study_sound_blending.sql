-- Sound blending: Part 2 of each pretest/posttest, scored like the printed words.
-- Existing answers become item_type 'word'; sessions enrolled before this have null blend orders.
alter table public.readlr_study_responses
  add column if not exists item_type text not null default 'word' check (item_type in ('word','blend')),
  add column if not exists prompt_replayed boolean not null default false;

-- Blend items follow the 15 printed words, so positions run past the old 0-23 range.
alter table public.readlr_study_responses drop constraint if exists readlr_study_responses_position_check;
alter table public.readlr_study_responses add constraint readlr_study_responses_position_check check (position between 0 and 39);

alter table public.readlr_study_sessions
  add column if not exists pretest_blend_order text[],
  add column if not exists posttest_blend_order text[];

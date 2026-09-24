-- Run this migration in the Supabase SQL Editor, or with `supabase db push`.
-- Replaces the stage frames with image frames (public/frames/<asset_key>.png) and adds four free image frames.

-- Stage pairs: girl style + boy style, both unlock on stage completion.
insert into public.frames (asset_key, name, unlock_stage_id, design_notes, sort_order)
select v.asset_key, v.name, s.id, v.design_notes, v.sort_order
from (values
  (1, 'purple-heart', 'Purple Heart', 'Image frame, stage 1 girl style.', 10),
  (1, 'ice-crystal', 'Ice Crystal', 'Image frame, stage 1 boy style.', 11),
  (2, 'purple-star', 'Purple Star', 'Image frame, stage 2 girl style.', 20),
  (2, 'fire-and-water', 'Fire and Water', 'Image frame, stage 2 boy style.', 21),
  (3, 'purple-dragon', 'Purple Dragon', 'Image frame, stage 3 girl style.', 30),
  (3, 'red-ring', 'Red Ring', 'Image frame, stage 3 boy style.', 31)
) as v(stage_number, asset_key, name, design_notes, sort_order)
join public.stages s on s.stage_number = v.stage_number;

-- Free frames (unlock_stage_id null); the frames service grants these to every user automatically.
insert into public.frames (asset_key, name, unlock_stage_id, design_notes, sort_order) values
  ('blue-floral', 'Blue Floral', null, 'Image frame, free for everyone.', 3),
  ('gold-ornate', 'Gold Ornate', null, 'Image frame, free for everyone.', 4),
  ('purple-cosmic', 'Purple Cosmic', null, 'Image frame, free for everyone.', 5),
  ('yellow-ring', 'Yellow Ring', null, 'Image frame, free for everyone.', 6);

-- Learners who already earned any older frame for a stage receive both new frames for that stage.
insert into public.user_unlocked_frames (user_id, frame_id)
select distinct uuf.user_id, new_f.id
from public.user_unlocked_frames uuf
join public.frames old_f on old_f.id = uuf.frame_id
join public.frames new_f on new_f.unlock_stage_id = old_f.unlock_stage_id
where new_f.asset_key in ('purple-heart', 'ice-crystal', 'purple-star', 'fire-and-water', 'purple-dragon', 'red-ring')
  and old_f.asset_key not in ('purple-heart', 'ice-crystal', 'purple-star', 'fire-and-water', 'purple-dragon', 'red-ring')
on conflict do nothing;

-- Remove all older stage frames; this cascades their unlock rows and clears any equipped reference.
delete from public.frames
where unlock_stage_id is not null
  and asset_key not in ('purple-heart', 'ice-crystal', 'purple-star', 'fire-and-water', 'purple-dragon', 'red-ring');

-- Run this migration in the Supabase SQL Editor, or with `supabase db push`.
-- Replaces the single frame per stage with a pair (girl style + boy style); both unlock together.

insert into public.frames (asset_key, name, unlock_stage_id, design_notes, sort_order)
select v.asset_key, v.name, s.id, v.design_notes, v.sort_order
from (values
  (1, 'blossom-wreath', 'Blossom Wreath', 'Green vine wreath with pink lilies and small purple blossoms.', 10),
  (1, 'star-striker-ring', 'Star Striker Ring', 'Bold blue-to-teal ring with white stars around the rim.', 11),
  (2, 'golden-rose-ring', 'Golden Rose Ring', 'Thin double gold ring with pink rose clusters and leaves.', 20),
  (2, 'thunder-bolt-ring', 'Thunder Bolt Ring', 'Bold navy-to-electric-blue ring with yellow lightning bolts.', 21),
  (3, 'lavender-tiara-wreath', 'Lavender Tiara Wreath', 'Lavender flower wreath with a small gold tiara on top.', 30),
  (3, 'champion-shield-ring', 'Champion Shield Ring', 'Bold teal-to-emerald ring with a gold shield emblem and stars.', 31)
) as v(stage_number, asset_key, name, design_notes, sort_order)
join public.stages s on s.stage_number = v.stage_number;

-- Learners who already earned an old stage frame receive both new frames for that stage.
insert into public.user_unlocked_frames (user_id, frame_id)
select distinct uuf.user_id, new_f.id
from public.user_unlocked_frames uuf
join public.frames old_f on old_f.id = uuf.frame_id
join public.frames new_f on new_f.unlock_stage_id = old_f.unlock_stage_id
where old_f.asset_key in ('star-trail-ring', 'lightning-bridge-ring', 'crown-jewel-ring')
  and new_f.asset_key not in ('star-trail-ring', 'lightning-bridge-ring', 'crown-jewel-ring')
on conflict do nothing;

-- Removing the old frames cascades their unlock rows and clears any equipped reference.
delete from public.frames
where asset_key in ('star-trail-ring', 'lightning-bridge-ring', 'crown-jewel-ring');

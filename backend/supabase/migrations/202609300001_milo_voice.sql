alter table public.learner_settings
  add column if not exists milo_voice text not null default 'milo'
  check (milo_voice in ('milo', 'classic'));

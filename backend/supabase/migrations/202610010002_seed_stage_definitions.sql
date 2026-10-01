-- Progress foreign keys and reading-journey sync require these definitions.
insert into public.stages(stage_number,title,description,difficulty) values
  (1,'Valley of Vowels','Train vowel powers and restore the valley.',1),
  (2,'Blending Bridges','Join consonants and vowels to restore bridges.',2),
  (3,'CVC Kingdom','Read CVC words and restore the crown.',3)
on conflict(stage_number) do nothing;

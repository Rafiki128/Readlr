# Milo Contextual Guidance Script

These lines are the fixed Step 14 prototype dialogue. They may be recorded or cached as narration. They must never replace the approved phoneme, blend, or whole-word models.

| Context | Event | Concise line | Full line | Allowed action |
| --- | --- | --- | --- | --- |
| Guided blend | First visit | Hear it. Then build it. | Hear each model from left to right. Then build the word with the letter tiles. | None |
| Guided blend | Return | Hear, then build. | Welcome back. Start with the sound models, then build from left to right. | None |
| Guided blend | First error | Find the next letter. | Start at the empty space. Which letter comes next from left to right? | Show the next space |
| Guided blend | Repeated error | Hear the models again. | Let us hear the approved models again, then return to the tiles. | Play approved models |
| Guided blend | Success | Word built! | You joined the sounds and built the word. | None |
| Adventure | First visit | See it. Build it. | Use the picture clue, then build the camp word from left to right. | None |
| Adventure | Return | Build the bridge word. | The bridge remembers you. Build the word from left to right. | None |
| Adventure | First error | Check the next plank. | Look at the first empty bridge plank. Choose the sound that belongs there. | Focus next plank |
| Adventure | Repeated error | Practice the blend first. | We can practice joining the sounds before trying this bridge again. | Suggest approved practice |
| Adventure | Success | Bridge restored! | You built the word and restored the bridge. | None |
| Independent check | First visit | Your turn. I will wait. | This is your quiet try. Milo will wait while you listen once and choose for yourself. | None |
| Independent check | Return | Try on your own. | Take another quiet try. No hints appear while an answer is in progress. | None |
| Independent check | First error | Saved. Practice comes next. | That answer is saved. Let us move to the matching practice after the check. | Suggest approved practice after check |
| Independent check | Repeated error | Pause and practice. | The check will stop here so we can practice the smallest missing skill. | Suggest approved practice |
| Independent check | Success | Check saved. | Your answers are saved for review. | None |
| Delayed review | First visit | What do you remember? | A little time has passed. Try these sounds and one word without a clue. | None |
| Delayed review | Return | Try the later check. | This later check is ready. Milo will stay quiet while you remember. | None |
| Delayed review | First error | Saved. Keep going. | That answer stays saved. Practice can happen after the review. | None |
| Delayed review | Repeated error | Review, then practice. | Finish this short review, then revisit the focused blend lesson. | Suggest approved practice after review |
| Delayed review | Success | Later check saved. | Your later answers are saved separately from your first check. | None |

## Book help ladder (word rounds and sound lessons)

Practice only. Checkpoints keep no hints. Each line falls back to the computer voice until recorded.

| Moment | Line | Action |
| --- | --- | --- |
| After a miss | Good try! Tap the light for help. | Help button glows |
| After every hint is used | Good try! Have another go. | None |
| Hint: hear and point (build) | Listen. Start at the glowing space. | Play the word, glow the next space |
| Hint: glow tile (build) | The glowing letter comes next. | Glow the next tile |
| Hint: mouth tip | (the sound card cue, for example "Let air flow like a quiet hiss.") | None |
| Hint: fewer choices | I took one away. Try again. | Fade one wrong choice |
| Hint: story (picture meaning) | Listen to the little story. | Play the story sentence |
| Hint: picture (read aloud) | Look at the picture and listen. | Play the picture scene line |
| Hint: hear word (read aloud) | Listen, then say it with me. | Play the word |
| Show me how (build) | Watch me first. Then you try. | Fill the tiles, then reset; the word comes back once |
| Show me how (choices) | Tap the glowing one. | Glow the answer; the word comes back once |
| Sound lesson show me | The glowing letter is {letter}. | Glow the letter |

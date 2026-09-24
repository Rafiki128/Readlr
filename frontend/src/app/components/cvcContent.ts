export type CvcMode = "conjure" | "ending" | "middle" | "change" | "read" | "build" | "match";
export interface CvcLesson {
  id: number; word: string; title: string; area: number; mode: CvcMode;
  story: string; result: string; from?: string;
}
export const CVC_AREAS = ["Kingdom Walls & Town", "Market Garden & Castle Gates", "Royal Rooms", "Crystal Tower & Throne"];
export const CVC_LESSONS: CvcLesson[] = [
  { id:1, word:"sun", title:"A little light", area:0, mode:"conjure", story:"The castle gate is sleepy. Let's make a sun to wake it!", result:"Your sun lights the castle gate!" },
  { id:2, word:"map", title:"The lost path", area:0, mode:"ending", story:"Milo needs a map. Find the last letter to finish map.", result:"Your map shows the path into the castle!" },
  { id:3, word:"hen", title:"A garden friend", area:0, mode:"middle", story:"A hen is waiting at the gate. Find the middle letter in hen.", result:"The hen leads Milo into the garden!" },
  { id:4, word:"cup", from:"cap", title:"A tiny change", area:0, mode:"change", story:"Change cap into cup. Which middle letter needs to change?", result:"Your cup catches water for the garden!" },
  { id:5, word:"rug", title:"A soft landing", area:0, mode:"conjure", story:"Three sounds can make a rug. Let's give Milo a soft landing!", result:"Your rug unrolls over the chilly stones!" },
  { id:6, word:"pot", title:"Room to grow", area:1, mode:"conjure", story:"This little seed needs a home. Read pot to make one!", result:"Your pot gives the seed a place to grow!" },
  { id:7, word:"net", title:"Catch the leaves", area:1, mode:"build", story:"Leaves are floating in the fountain. Pick the three letters in net to build a rescue spell!", result:"Your net clears the sparkling fountain!" },
  { id:8, word:"bug", title:"A little visitor", area:1, mode:"middle", story:"A tiny garden helper needs a name. Find the middle letter in bug.", result:"The bug helps the flowers bloom!" },
  { id:9, word:"hat", from:"hot", title:"Shade for Milo", area:1, mode:"change", story:"It is hot in the garden. Change hot into hat!", result:"Your hat keeps Milo cool in the sunshine!" },
  { id:10, word:"log", title:"Across the stream", area:1, mode:"read", story:"A little stream blocks the door. Read log to make a crossing!", result:"Your log carries Milo across the stream!" },
  { id:11, word:"bed", title:"A resting place", area:2, mode:"match", story:"The castle guest room is empty. Choose bed, then read it to make a resting place!", result:"Your bed makes the guest room cosy!" },
  { id:12, word:"pen", title:"A royal letter", area:2, mode:"ending", story:"Milo wants to write a thank-you note. Finish pen to help him!", result:"Your pen writes a thank-you to the kingdom!" },
  { id:13, word:"pig", title:"The painted door", area:2, mode:"middle", story:"A pig is missing from this picture. Find its middle letter!", result:"The pig picture appears and the door opens!" },
  { id:14, word:"tin", from:"ten", title:"The music room", area:2, mode:"change", story:"Change ten into tin. A little tin can become a drum!", result:"Your tin drum brings music back to the room!" },
  { id:15, word:"bag", title:"Pack the magic", area:2, mode:"build", story:"Milo needs to carry the letter stones. Pick the letters in bag, then read your spell!", result:"Your bag keeps the letter stones safe!" },
  { id:16, word:"gem", title:"The crystal light", area:3, mode:"read", story:"The tower lantern is dark. Here is a new trick: in gem, g sounds like j. Read gem to light the stairs!", result:"Your gem lights the crystal staircase!" },
  { id:17, word:"fan", title:"Clear the mist", area:3, mode:"ending", story:"Mist hides the next step. Finish fan to blow it away!", result:"Your fan clears the mist from the tower!" },
  { id:18, word:"lid", title:"The treasure box", area:3, mode:"middle", story:"The treasure box needs a lid. Find the middle letter in lid!", result:"Your lid keeps the crown safe for its journey!" },
  { id:19, word:"top", title:"Wake the throne", area:3, mode:"read", story:"The throne room needs a little joy. Read top to set it spinning!", result:"Your spinning top wakes the throne room!" },
];
export const CROWN_WORDS = ["a", "ma", "map"];
export const CROWN_PROMPTS = ["First, your vowel power! Listen to the a sound.", "Now, your sound team! Join m and a. Listen to ma.", "One more sound makes a word. Add p to ma. Listen to map."];
export const CROWN_RESULTS = ["Your vowel power lights the first jewel!", "Your sound team lights the second jewel!", "Your whole word lights the last jewel. The crown shines again!"];
export interface CvcJourney { version:1; completed:number; jewels:number }
export const emptyCvcJourney = (): CvcJourney => ({version:1, completed:0, jewels:0});
export function normalizeCvcJourney(value: unknown): CvcJourney {
  const raw = value as Partial<CvcJourney> | null;
  if (!raw || raw.version !== 1) return emptyCvcJourney();
  const completed = Number.isInteger(raw.completed) ? Math.max(0, Math.min(20, raw.completed!)) : 0;
  const jewels = completed < 19 ? 0 : Math.max(0, Math.min(3, Number.isInteger(raw.jewels) ? raw.jewels! : 0));
  return {version:1, completed:completed === 20 && jewels < 3 ? 19 : completed, jewels};
}
// Keeps the device journey unless the server copy has more lessons or crown jewels.
export function furtherCvcJourney(local:CvcJourney, remote:unknown):CvcJourney {
  const other = normalizeCvcJourney(remote);
  return other.completed > local.completed || (other.completed === local.completed && other.jewels > local.jewels) ? other : local;
}
export function finishCvcLesson(journey:CvcJourney, id:number):CvcJourney {
  if (id !== journey.completed + 1 || id > 19) return journey;
  return {...journey, completed:id};
}
export function restoreCrownJewel(journey:CvcJourney, index:number):CvcJourney {
  if (journey.completed < 19 || index !== journey.jewels || index > 2) return journey;
  const jewels = index + 1;
  return {...journey, jewels, completed:jewels === 3 ? 20 : 19};
}
export const cvcStorageKey = (learnerId?:number|null) => learnerId ? `readlr_cvc_magic_v1_${learnerId}` : null;
export function readCvcJourney(learnerId?:number|null):CvcJourney {
  const key = cvcStorageKey(learnerId);
  if (!key) return emptyCvcJourney();
  try { return normalizeCvcJourney(JSON.parse(localStorage.getItem(key) || "null")); } catch { return emptyCvcJourney(); }
}
export function cvcChoices(lesson:CvcLesson):string[] {
  const index = lesson.mode === "ending" ? 2 : 1;
  const correct = lesson.word[index];
  const pool = index === 1 ? ["a","e","i","o","u"] : ["m","t","p","n","g","d"];
  const alternatives = pool.filter(letter=>letter !== correct && letter !== lesson.from?.[index]);
  const options = [correct, lesson.from?.[index] || alternatives[0], alternatives[1]];
  return [...new Set(options)].sort();
}
export function cvcHasVoice(peak:number, frames:number, bytes:number) { return peak >= .018 && frames >= 4 && bytes > 1000; }
export function cvcReadyLine(word:string) { return `Say ${word} with me. Ready? Go!`; }

export function cvcLetterTray(lesson:CvcLesson) {
  const extra = ["a","e","s","t"].find(letter=>!lesson.word.includes(letter))!;
  return [...lesson.word,extra].sort();
}
export function cvcWordChoices(lesson:CvcLesson) {
  return [lesson.word,`${lesson.word[0]}a${lesson.word[2]}`,`${lesson.word[0]}i${lesson.word[2]}`].sort();
}
export function placeCvcLetter(word:string, placed:string, letter:string) {
  return placed.length<word.length && word[placed.length]===letter ? placed+letter : placed;
}
export function cvcPuzzleLine(lesson:CvcLesson) {
  if(lesson.mode==="build") return `Pick the letters in ${lesson.word}. Start with the first sound.`;
  if(lesson.mode==="match") return `Which word is ${lesson.word}?`;
  if(lesson.mode==="conjure") return "Tap the glowing stone. Follow the sounds from left to right.";
  if(lesson.mode==="change") return `Swap the middle sound to change ${lesson.from} into ${lesson.word}.`;
  return `Find the ${lesson.mode==="ending"?"last":"middle"} letter in ${lesson.word}.`;
}

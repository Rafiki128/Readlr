export type BridgeMode = "join" | "missing" | "echo" | "switch" | "repair";
export type BridgeLesson = {
  id: string; title: string; blend: string; mode: BridgeMode; region: number;
  intro: string; success: string; training: boolean;
};
export const BRIDGE_REGIONS = [
  { name: "Brook Crossing", subtitle: "Wake the waterway", color: "#86EFAC", water: "#38BDF8" },
  { name: "Waterfall Walk", subtitle: "Follow the falling water", color: "#F9A8D4", water: "#22D3EE" },
  { name: "Sky Bridges", subtitle: "Above the cloud gardens", color: "#C4B5FD", water: "#7DD3FC" },
];
const training = [
  ["Meet the sound team", "MA", "join", "Meet our first sound team. The humming sound joins the vowel. Listen as the two pieces become one blend."],
  ["Slide the sounds", "SE", "join", "A new sound piece has arrived. Watch it slide toward the vowel. Listen to the joined sound, then try it with Milo."],
  ["Find the first piece", "LI", "missing", "Our workbench has an empty space. Listen to the blend, then choose the piece that belongs at the start."],
  ["Follow the echo", "NO", "echo", "The workshop bell is calling a sound team. Listen, choose the matching team, and send its sound back."],
  ["Change a sound", "TU", "switch", "Keep the vowel on the bench. Change the first piece to make a new sound team. Listen carefully before you choose."],
] as const;
export const WORKSHOP_LESSONS: BridgeLesson[] = training.map(([title, blend, mode, intro], index) => ({
  id: `workshop-${index + 1}`, title, blend, mode, intro, region: 0, training: true,
  success: `Thank you for practising! Our ${blend.toLowerCase()} sound team is ready to help Milo build.`,
}));
const crossings = [
  ["Pebble Landing", "MA", "join", "The brook washed away the middle of this little bridge. Join our sound team and lend Milo your voice to fit the planks.", "The planks fit together! Milo has a safe path across the bubbling brook."],
  ["The Lost Plank", "SE", "missing", "One sound plank drifted into the reeds. Listen to the blend, then find its first piece.", "You found the missing piece. The reed bridge is whole again!"],
  ["Echo Bend", "LI", "echo", "The river bends around a singing stone. Hear its sound team, choose the matching pair, then echo it back.", "The stone answered your voice. A new crossing reaches the grassy bank."],
  ["Willow Switch", "NO", "switch", "The willow bridge needs a new first sound. Keep the vowel and swap the first plank to match what you hear.", "The new sound team locked the planks together. Milo can pass beneath the willow."],
  ["Brook Beacon", "TU", "repair", "The last brook bridge is nearly ready. Listen to its sound team and help Milo finish the crossing.", "The brook beacon is shining! All five little bridges lead toward the waterfall."],
  ["Ribbon Falls", "PA", "join", "Water ribbons tumble beneath a broken walkway. Join the sound pieces to help Milo connect both banks.", "The walkway stretches across the falls. Milo can feel the cool spray!"],
  ["Waterwheel Way", "BE", "missing", "The waterwheel is waiting for a missing sound plank. Find the first piece of the blend you hear.", "The wheel turns again, lifting the bridge above the racing water."],
  ["Crystal Echo", "DI", "echo", "A crystal grotto echoes a sound team. Choose its matching pair and send your voice through the cavern.", "The crystals glow along the repaired bridge. Milo follows their light."],
  ["Spraystone Steps", "FO", "switch", "A spraystone bridge has the wrong first piece. Keep the vowel and choose the new sound you hear.", "The steps rise out of the spray. Milo climbs toward the upper pool."],
  ["Rainbow Crossing", "MU", "repair", "A rainbow waits beyond the final waterfall bridge. Listen, join the sounds, and give Milo a way across.", "The waterfall route is restored. A rainbow points toward the cloud gardens!"],
  ["Cloud Landing", "VA", "join", "Two little islands float above the clouds. Join our sound team to help Milo connect their landing places.", "The cloud bridge holds steady. Milo steps onto the next floating island."],
  ["Kitepost Bridge", "VE", "missing", "A kite carried off a sound plank. Listen closely and choose the first piece to bring the bridge together.", "The kite settles on its post. The sky bridge is ready for Milo."],
  ["Starbell Echo", "VI", "echo", "The starbell rings out a sound team. Find the matching pair and answer with your own voice.", "The starbell lights the crossing. Milo follows it through the cloud garden."],
  ["Breezy Switch", "VO", "switch", "The breeze has mixed up the first sound plank. Keep the vowel and swap in the piece you hear.", "The right sound team steadies the swaying bridge. Milo reaches the summit path."],
  ["The Grand Crossing", "VU", "repair", "One final bridge joins our sky gardens. Listen to this familiar team, then give Milo your building voice.", "The grand crossing is restored! From brook to waterfall to sky, you helped Milo connect the whole journey."],
] as const;
export const CROSSING_LESSONS: BridgeLesson[] = crossings.map(([title, blend, mode, intro, success], index) => ({
  id: `crossing-${index + 1}`, title, blend, mode, intro, success, region: Math.floor(index / 5), training: false,
}));
export const CONSONANTS = "BCDFGHJKLMNPQRSTVWXYZ".split("");
export const CONSONANT_SOUND_FALLBACKS: Record<string, string> = { B:"buh", C:"kuh", D:"duh", F:"fff", G:"guh", H:"hhh", J:"juh", K:"kuh", L:"lll", M:"mmm", N:"nnn", P:"puh", Q:"kwuh", R:"rrr", S:"sss", T:"tuh", V:"vvv", W:"wuh", X:"ks", Y:"yuh", Z:"zzz" };
export const AVAILABLE_BLENDS = ["MA", "SA", "NA", "LA", "BA", "TA", "PA", "DA"];
export function randomizedCrossingLessons(learnerId?: number | null): BridgeLesson[] {
  const blends = CROSSING_LESSONS.map(lesson => lesson.blend);
  let seed = (learnerId ?? 17) * 9301 + 49297;
  for (let index = blends.length - 1; index > 0; index--) {
    seed = (seed * 9301 + 49297) % 233280;
    const swap = Math.floor(seed / 233280 * (index + 1));
    [blends[index], blends[swap]] = [blends[swap], blends[index]];
  }
  return CROSSING_LESSONS.map((lesson, index) => ({ ...lesson, blend: blends[index] }));
}
export function lessonChoices(lesson: BridgeLesson): { target: string; options: string[] } | null {
  const consonant = lesson.blend[0].toLowerCase();
  if (lesson.mode === "missing") return { target: consonant, options: [consonant, "a"] };
  if (lesson.mode === "switch") return { target: consonant, options: [consonant, consonant === "m" ? "s" : "m"] };
  if (lesson.mode === "echo") return { target: lesson.blend.toLowerCase(), options: [lesson.blend.toLowerCase(), `${lesson.blend[0] === "M" ? "s" : "m"}${lesson.blend[1].toLowerCase()}`] };
  return null;
}

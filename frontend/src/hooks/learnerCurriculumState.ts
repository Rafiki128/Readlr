export interface LearnerCurriculumState {
  schemaVersion:1;
  campOrientationStep:number;
  guidedStops:string[];
  guidedActivities:Record<string,boolean>;
  guidedRounds:Record<string,{step:number;spoken:string[]}>;
  carouselFocus:number;
  stickerBookOpened:boolean;
  soundRecordings:Array<{word:string;recordedAt:string}>;
  updatedAt:string;
}

export const curriculumStateKey=(learnerId:number)=>`readlr_curriculum_state_v1_${learnerId}`;
export const CURRICULUM_STATE_CHANGED='readlr:curriculum-state-changed';
export const emptyLearnerCurriculumState=():LearnerCurriculumState=>({schemaVersion:1,campOrientationStep:0,guidedStops:[],guidedActivities:{},guidedRounds:{},carouselFocus:0,stickerBookOpened:false,soundRecordings:[],updatedAt:new Date(0).toISOString()});

const BOOK_ONE_STARTER_STOPS=['gate:mango','gate:apple','gate:top'] as const;
const LEGACY_BOOK_ONE_STOPS:Record<string,string>={
  m:'gate:mango',mango:'gate:mango','gate:m':'gate:mango',
  a:'gate:apple',apple:'gate:apple','short:a':'gate:apple','gate:a':'gate:apple','gate:short:a':'gate:apple',
  t:'gate:top',top:'gate:top','gate:t':'gate:top',
};

export function normalizeGuidedStops(stops:unknown):string[] {
  if(!Array.isArray(stops))return [];
  return [...new Set(stops.flatMap(stop=>{
    if(typeof stop!=='string'||!stop.trim())return [];
    const value=stop.trim();
    return [LEGACY_BOOK_ONE_STOPS[value]??value];
  }))];
}

export function completedBookOneStarterStops(state:LearnerCurriculumState) {
  const visited=new Set(normalizeGuidedStops(state.guidedStops));
  return BOOK_ONE_STARTER_STOPS.filter(stop=>visited.has(stop)).length;
}

function readLegacyCurriculumState(learnerId:number):LearnerCurriculumState {
  const legacy=emptyLearnerCurriculumState();
  if(typeof localStorage==='undefined')return legacy;
  try{legacy.guidedStops=normalizeGuidedStops(JSON.parse(localStorage.getItem(`readlr_aral_guided_v1_${learnerId}`)||'[]'));}catch{/* Keep recoverable account state even if one legacy value is malformed. */}
  if(localStorage.getItem(`readlr_first_reward_v1_${learnerId}`)==='seen')legacy.guidedStops=normalizeGuidedStops([...legacy.guidedStops,...BOOK_ONE_STARTER_STOPS]);
  const orientation=Number(localStorage.getItem(`readlr_camp_orientation_v1_${learnerId}`));
  if(Number.isFinite(orientation))legacy.campOrientationStep=Math.max(0,Math.min(3,orientation));
  const carousel=Number(localStorage.getItem(`readlr_aral_carousel_v1_${learnerId}`));
  if(Number.isInteger(carousel))legacy.carouselFocus=Math.max(0,Math.min(9,carousel));
  return legacy;
}

export function readLearnerCurriculumState(learnerId:number):LearnerCurriculumState {
  let current=emptyLearnerCurriculumState();
  try { current={...current,...JSON.parse(localStorage.getItem(curriculumStateKey(learnerId))||'{}')}; }
  catch {/* Merge any recoverable legacy progress below. */}
  return mergeLearnerCurriculumState(current,readLegacyCurriculumState(learnerId));
}
export function mergeLearnerCurriculumState(a:LearnerCurriculumState,b:LearnerCurriculumState):LearnerCurriculumState {
  const recordings=[...a.soundRecordings,...b.soundRecordings];
  const roundKeys=new Set([...Object.keys(a.guidedRounds),...Object.keys(b.guidedRounds)]);
  const guidedRounds=Object.fromEntries([...roundKeys].map(key=>{
    const left=a.guidedRounds[key],right=b.guidedRounds[key];
    if(!left)return [key,right];
    if(!right)return [key,left];
    const furthest=right.step>=left.step?right:left;
    return [key,{step:Math.max(left.step,right.step),spoken:[...new Set([...left.spoken,...right.spoken,...furthest.spoken])]}];
  }));
  return {schemaVersion:1,campOrientationStep:Math.max(a.campOrientationStep,b.campOrientationStep),guidedStops:normalizeGuidedStops([...a.guidedStops,...b.guidedStops]),
    guidedActivities:{...a.guidedActivities,...b.guidedActivities},guidedRounds,carouselFocus:Date.parse(b.updatedAt)>=Date.parse(a.updatedAt)?b.carouselFocus:a.carouselFocus,
    stickerBookOpened:a.stickerBookOpened||b.stickerBookOpened,soundRecordings:[...new Map(recordings.map(item=>[`${item.word}:${item.recordedAt}`,item])).values()].slice(-200),updatedAt:new Date().toISOString()};
}
export function saveLearnerCurriculumState(learnerId:number,state:LearnerCurriculumState,notify=true) {
  const next={...state,updatedAt:new Date().toISOString()};
  localStorage.setItem(curriculumStateKey(learnerId),JSON.stringify(next));
  if(notify&&typeof window!=='undefined')window.dispatchEvent(new CustomEvent(CURRICULUM_STATE_CHANGED,{detail:{learnerId}}));
  return next;
}
export function patchLearnerCurriculumState(learnerId:number,patch:Partial<LearnerCurriculumState>) {
  return saveLearnerCurriculumState(learnerId,{...readLearnerCurriculumState(learnerId),...patch});
}
// Dev server only: VITE_UNLOCK_ALL=true opens every book, stop and feature for manual testing.
export const DEV_UNLOCK_ALL=Boolean(import.meta.env?.DEV&&import.meta.env?.VITE_UNLOCK_ALL==='true');
export const curriculumUnlocks=(state:LearnerCurriculumState,completedBooks:string[])=>({
  camp:DEV_UNLOCK_ALL||state.campOrientationStep>=3,
  bookOne:DEV_UNLOCK_ALL||state.campOrientationStep>=3,
  stickers:DEV_UNLOCK_ALL||completedBookOneStarterStops(state)>=3,
  sounds:DEV_UNLOCK_ALL||completedBookOneStarterStops(state)>=3,
  progress:DEV_UNLOCK_ALL||completedBooks.includes('gate'),
  achievements:DEV_UNLOCK_ALL||completedBooks.includes('gate'),
});

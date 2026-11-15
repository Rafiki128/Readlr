import {useEffect,useRef,useState,type CSSProperties,type PointerEvent,type ReactNode} from 'react';
import {ArrowLeft,ArrowRight,Check,ShieldCheck,MessageCircle} from 'lucide-react';
import {CLASSROOM_API} from '../hooks/useClassroom';
import {CharacterCompanion} from './CharacterCompanion';
import {LandmarkArt} from './AdventureArt';
import {HearMiloButton} from './MiloSays';
import {ReadingWorldBackdrop} from './ReadingWorldBackdrop';
import {learningVolume} from '../../hooks/learningSettings';
import {trackMouth} from '../../hooks/miloMouth';
import {playOnSpeaker} from '../../hooks/speaker';
import './studentSurvey.css';

type Lang='en'|'ceb';
type Answer=number|string|null;
export interface SurveyData {version:string;questions:{id:number;en:string;ceb:string;kind:string}[];choices:Record<number,string[][]>;scale:string[][];submittedAt:string|null}

// Rating faces from a gentle frown (1) to a big smile (5).
const mouths=['M22 46Q32 38 42 46','M23 44Q32 41 41 44','M23 43H41','M21 39Q32 49 43 39',''];
function Face({value}:{value:number}) {
  return <svg viewBox="0 0 64 64" aria-hidden="true" className="survey-face-art">
    <circle cx="32" cy="32" r="28" fill="#ffd966" stroke="#f6bf43" strokeWidth="3"/>
    {value===5?<path d="M19 28q5-6 10 0M35 28q5-6 10 0" fill="none" stroke="#785365" strokeWidth="3.5" strokeLinecap="round"/>:<><circle cx={24} cy={value===1?29:27} r="3.4" fill="#785365"/><circle cx={40} cy={value===1?29:27} r="3.4" fill="#785365"/></>}
    {value>=4&&<><circle cx="16" cy="38" r="4.5" fill="#f592b4" opacity=".7"/><circle cx="48" cy="38" r="4.5" fill="#f592b4" opacity=".7"/></>}
    {value===5?<path d="M20 37Q32 55 44 37Z" fill="#785365"/>:<path d={mouths[value-1]} fill="none" stroke="#785365" strokeWidth="3.5" strokeLinecap="round"/>}
  </svg>;
}
// Each answer choice reuses the picture Readlr already shows for that place.
const choiceArt:Record<string,ReactNode>={characters:<CharacterCompanion state="idle" size={72}/>,games:<LandmarkArt kind="gate"/>,sounds:<LandmarkArt kind="sound"/>,reading:<LandmarkArt kind="library"/>,pictures:<LandmarkArt kind="storybook"/>,rewards:<LandmarkArt kind="stickers"/>,nothing:<Face value={5}/>};
const slug=(text:string)=>text.toLowerCase().replace(/[^a-z]+/g,'-');
// Question cards take turns with the colors of the learner navigation places.
const tones=['#3f78e0','#24976a','#8556d1','#e0538b','#d9861f','#c29411'];

export function StudentSurvey({token,userId,onBack}:{token:string;userId:number;onBack:()=>void}) {
  const [data,setData]=useState<SurveyData|null>(null);
  const [lang,setLang]=useState<Lang>('en');
  const [step,setStep]=useState(-1);
  const [answers,setAnswers]=useState<Answer[]>(Array(14).fill(null));
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [done,setDone]=useState(false);
  const [retry,setRetry]=useState(0);
  const heading=useRef<HTMLHeadingElement>(null);
  const voice=useRef<HTMLAudioElement|null>(null);
  const spoken=useRef<Promise<void>>(Promise.resolve());
  const picks=useRef(0);
  const advance=useRef<number|undefined>(undefined);
  const draftKey=`readlr-survey-draft:${userId}`;
  const t=(en:string,ceb:string)=>lang==='en'?en:ceb;
  // Plays one survey recording through the shared speaker and resolves when it stops; a line already playing is not restarted.
  function say(file:string):Promise<void> {
    const src=`/audio/survey/${file}.wav`, playing=voice.current;
    if(playing&&!playing.paused&&playing.src.endsWith(src))return spoken.current;
    playing?.pause();
    if(learningVolume()===0)return Promise.resolve();
    const audio=new Audio(src);audio.volume=learningVolume();trackMouth(audio);voice.current=audio;
    spoken.current=new Promise(resolve=>{['ended','pause','error'].forEach(e=>audio.addEventListener(e,()=>resolve(),{once:true}));void playOnSpeaker(audio).catch(()=>resolve());});
    return spoken.current;
  }
  useEffect(()=>()=>{voice.current?.pause();window.clearTimeout(advance.current);},[]);
  // Leaving a question cancels any pending move to the next one.
  useEffect(()=>{picks.current++;window.clearTimeout(advance.current);},[step]);
  // Saves the answer, lets Milo say it, then opens the next question after a short pause.
  function pick(value:Answer,file:string){
    answer(value);
    window.clearTimeout(advance.current);
    const id=++picks.current, started=Date.now();
    void say(file).then(()=>{if(id===picks.current)advance.current=window.setTimeout(()=>{if(id===picks.current)setStep(s=>s+1);},Math.max(400,1200-(Date.now()-started)));});
  }
  useEffect(()=>{
    let active=true;
    fetch(`${CLASSROOM_API}/admin/survey/me`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message);if(active){
      try{const saved=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(d.submittedAt)sessionStorage.removeItem(draftKey);else if(saved?.version===d.version&&Array.isArray(saved.answers)&&saved.answers.length===14&&['en','ceb'].includes(saved.language)){setAnswers(saved.answers);setLang(saved.language);setStep(Number.isInteger(saved.step)&&saved.step>=-1&&saved.step<=14?saved.step:-1);}}catch{/* Storage is optional on shared or restricted devices. */}
      setData(d);setDone(!!d.submittedAt);setError('');}}).catch(e=>{console.warn('Survey could not load:',e);if(active)setError('Milo cannot open the survey right now. / Dili maablihan ni Milo ang survey karon.');});
    return()=>{active=false;};
  },[token,retry,draftKey]);
  useEffect(()=>{if(!data)return;try{if(done)sessionStorage.removeItem(draftKey);else sessionStorage.setItem(draftKey,JSON.stringify({version:data.version,language:lang,answers,step}));}catch{/* The survey remains usable without browser storage. */}},[data,lang,answers,step,done,draftKey]);
  useEffect(()=>{heading.current?.focus();},[step,done]);
  // Milo reads each screen aloud as it appears.
  useEffect(()=>{
    if(!data)return;
    if(done){if(!data.submittedAt)say(`${lang}/thank-you`);return;}
    say(step===-1?'welcome':step===14?`${lang}/all-done`:`${lang}/q${String(step+1).padStart(2,'0')}`);
  },[data,step,done,lang]);
  function answer(value:Answer){setAnswers(a=>a.map((old,i)=>i===step?value:old));}
  function choose(language:Lang){setLang(language);setStep(0);}
  async function submit(){
    if(!data||busy)return;setBusy(true);setError('');
    try{const r=await fetch(`${CLASSROOM_API}/admin/survey/me`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({version:data.version,language:lang,answers}),signal:AbortSignal.timeout(15000)});const d=await r.json();if(!r.ok)throw new Error(d.message);setDone(true);}
    // The child sees a gentle line; the technical reason stays in the console for grown-ups.
    catch(e){console.warn('Survey could not be sent:',e);setError(t("Milo couldn't send it yet. Let's try again!",'Wala pa nakapadala si Milo. Sulayi pag-usab!'));}finally{setBusy(false);}
  }
  const hover=(file:string)=>(e:PointerEvent)=>{if(e.pointerType==='mouse')say(file);};
  const q=data?.questions[step];
  return <div className="survey-world"><ReadingWorldBackdrop welcome/><main className="student-survey">
    {error&&<div className="survey-error" role="alert">{error}{!data&&<button onClick={()=>setRetry(n=>n+1)}>Try again / Sulayi pag-usab</button>}</div>}
    {!data&&!error&&<p role="status">Loading survey / Nag-load sa survey...</p>}
    {data&&<>
      {done?<section className="survey-finish"><div className="survey-mascot"><CharacterCompanion state="celebrating" size={150}/></div><h1 ref={heading} tabIndex={-1}>{t('Thank you!','Salamat!')}</h1><p>{t('Milo is so happy you shared.','Malipayon kaayo si Milo nga nisulti ka.')}</p><button className="survey-primary" onClick={onBack}>{t('Back to my adventure','Balik sa akong adventure')}<ArrowRight size={20}/></button></section>:
      step===-1?<section className="survey-welcome"><div className="survey-mascot"><CharacterCompanion state="idle" size={150} gesture="wave"/></div><h1 ref={heading} tabIndex={-1}>How was your adventure?<span lang="ceb">Kumusta ang imong adventure?</span></h1>
      <div className="survey-languages"><button onClick={()=>choose('en')}><MessageCircle size={34} aria-hidden="true"/>English</button><button lang="ceb" onClick={()=>choose('ceb')}><MessageCircle size={34} aria-hidden="true"/>Bisaya</button></div>
      <details className="survey-privacy"><summary><ShieldCheck size={17}/>{t('About your answers','Bahin sa imong mga tubag')}</summary><p>{t('Taking part is your choice. You can leave or skip any question. Your responses are linked to your Readlr account and are visible to authorized research administrators. They are used to evaluate and improve Readlr for this study, not to grade you. Responses are confidential; your personal details will not be published.','Ang pag-apil imong pagpili. Pwede kang mobiya o molaktaw og pangutana. Ang imong mga tubag konektado sa imong Readlr account ug makita sa awtorisadong research administrators. Gamiton kini sa pagsusi ug pagpaayo sa Readlr alang sa pagtuon, dili sa paghatag og grado. Kumpidensyal ang mga tubag; dili ipatik ang imong personal nga detalye.')}</p></details></section>:
      step===14?<section className="survey-finish"><div className="survey-mascot"><CharacterCompanion state="celebrating" size={150}/></div><h1 ref={heading} tabIndex={-1}>{t('All done!','Human na!')}</h1><p>{t('Tap Send to give your answers to Milo.','Pindota ang Ipadala aron ihatag kang Milo ang imong mga tubag.')}</p><footer className="survey-actions"><button className="survey-back" onClick={()=>setStep(13)}><ArrowLeft size={20}/>{t('Go back','Balik')}</button><button className="survey-primary survey-send" disabled={busy} onClick={submit}>{busy?t('Sending...','Gipadala...'):t('Send','Ipadala')}<Check size={28}/></button></footer></section>:
      q&&<section className="survey-question" key={q.id} style={{'--tone':tones[step%tones.length]} as CSSProperties}><div className="survey-dots" role="progressbar" aria-valuemin={1} aria-valuemax={14} aria-valuenow={step+1} aria-label={t(`Question ${step+1} of 14`,`Pangutana ${step+1} sa 14`)}>{answers.map((_,i)=><span key={i} className={i<step?'is-done':i===step?'is-current':''}/>)}</div>
      <div className="survey-ask"><span className="survey-ask-milo"><CharacterCompanion state="idle" size={96}/></span><h1 ref={heading} tabIndex={-1} id="survey-question-title">{q[lang]}</h1><HearMiloButton className="survey-hear" onClick={()=>{voice.current?.pause();say(`${lang}/q${String(step+1).padStart(2,'0')}`);}}/></div>
      <fieldset className={q.kind==='rating'?'survey-faces':'survey-choices'} aria-labelledby="survey-question-title">
      {q.kind==='rating'?data.scale.map((labels,i)=><label key={i} className={answers[step]===i+1?'selected':''} onPointerEnter={hover(`${lang}/face-${i+1}`)}><input type="radio" name={`q${q.id}`} value={i+1} checked={answers[step]===i+1} onChange={()=>pick(i+1,`${lang}/face-${i+1}`)}/><Face value={i+1}/><span>{labels[lang==='en'?0:1]}</span></label>):data.choices[q.id].map(([value,en,ceb])=><label key={value} className={answers[step]===value?'selected':''} onPointerEnter={hover(`${lang}/choice-${slug(en)}`)}><input type="radio" name={`q${q.id}`} value={value} checked={answers[step]===value} onChange={()=>pick(value,`${lang}/choice-${slug(en)}`)}/><span className="survey-choice-art" aria-hidden="true">{choiceArt[value]}</span><span>{lang==='en'?en:ceb}</span></label>)}
      </fieldset><footer className="survey-actions"><button className="survey-back" onClick={()=>setStep(step-1)}><ArrowLeft size={20}/>{t('Back','Balik')}</button><button className="survey-skip" onClick={()=>{answer(null);setStep(step+1);}}>{t('Skip','Laktawi')}</button><button className="survey-primary" disabled={answers[step]===null} onClick={()=>setStep(step+1)}>{t('Next','Sunod')}<ArrowRight size={20}/></button></footer></section>}
    </>}
  </main></div>;
}

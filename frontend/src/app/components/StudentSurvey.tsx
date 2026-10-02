import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,Star,Heart,Gamepad2,Volume2,BookOpen,Image,Trophy,UserRound,Globe,ShieldCheck} from 'lucide-react';
import {CLASSROOM_API} from '../hooks/useClassroom';
import {CharacterCompanion} from './CharacterCompanion';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from './ui/select';
import './studentSurvey.css';

type Lang='en'|'ceb';
type Answer=number|string|null;
export interface SurveyData {version:string;questions:{id:number;en:string;ceb:string;kind:string}[];choices:Record<number,string[][]>;scale:string[][];submittedAt:string|null}
const icons:Record<string,typeof Star>={characters:UserRound,games:Gamepad2,sounds:Volume2,reading:BookOpen,pictures:Image,rewards:Trophy,nothing:Heart};
export function StudentSurvey({token,userId,onBack}:{token:string;userId:number;onBack:()=>void}) {
  const [data,setData]=useState<SurveyData|null>(null);
  const [lang,setLang]=useState<Lang>('en');
  const [section,setSection]=useState('');
  const [step,setStep]=useState(-1);
  const [answers,setAnswers]=useState<Answer[]>(Array(14).fill(null));
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [done,setDone]=useState(false);
  const [retry,setRetry]=useState(0);
  const heading=useRef<HTMLHeadingElement>(null);
  const draftKey=`readlr-survey-draft:${userId}`;
  const t=(en:string,ceb:string)=>lang==='en'?en:ceb;
  useEffect(()=>{
    let active=true;
    fetch(`${CLASSROOM_API}/admin/survey/me`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message);if(active){
      try{const saved=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(d.submittedAt)sessionStorage.removeItem(draftKey);else if(saved?.version===d.version&&Array.isArray(saved.answers)&&saved.answers.length===14&&typeof saved.section==='string'&&['en','ceb'].includes(saved.language)){setAnswers(saved.answers);setSection(saved.section.slice(0,80));setLang(saved.language);setStep(Number.isInteger(saved.step)&&saved.step>=-1&&saved.step<=14?saved.step:-1);}}catch{/* Storage is optional on shared or restricted devices. */}
      setData(d);setDone(!!d.submittedAt);setError('');}}).catch(e=>{if(active)setError(e.message||'Survey could not load.');});
    return()=>{active=false;};
  },[token,retry,draftKey]);
  useEffect(()=>{if(!data)return;try{if(done)sessionStorage.removeItem(draftKey);else sessionStorage.setItem(draftKey,JSON.stringify({version:data.version,section,language:lang,answers,step}));}catch{/* The survey remains usable without browser storage. */}},[data,section,lang,answers,step,done,draftKey]);
  useEffect(()=>{heading.current?.focus();},[step,done]);
  function answer(value:Answer){setAnswers(a=>a.map((old,i)=>i===step?value:old));}
  async function submit(){
    if(!data||busy)return;setBusy(true);setError('');
    try{const r=await fetch(`${CLASSROOM_API}/admin/survey/me`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({version:data.version,section,language:lang,answers}),signal:AbortSignal.timeout(15000)});const d=await r.json();if(!r.ok)throw new Error(d.message);setDone(true);}
    catch(e){setError(t('Could not confirm submission. Your answers are still here. ','Wala makumpirma ang pagpadala. Ania pa ang imong mga tubag. ')+(e as Error).message);}finally{setBusy(false);}
  }
  const q=data?.questions[step];
  return <main className="student-survey">
    <div className="survey-top"><button onClick={onBack} className="survey-back"><ArrowLeft size={18}/>{t('Back to Readlr','Balik sa Readlr')}</button><div className="survey-language"><Globe size={17}/><Select value={lang} onValueChange={value=>setLang(value as Lang)}><SelectTrigger aria-label="Survey language"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="ceb">Cebuano</SelectItem></SelectContent></Select></div></div>
    {error&&<div className="survey-error" role="alert">{error}{!data&&<button onClick={()=>setRetry(n=>n+1)}>Try again / Sulayi pag-usab</button>}</div>}
    {!data&&!error&&<p role="status">Loading survey / Nag-load sa survey...</p>}
    {data&&<>
      {done?<section className="survey-finish"><span className="survey-finish-mark"><Check size={38}/></span><h1 ref={heading} tabIndex={-1}>{t('Thank you for sharing!','Salamat sa imong mga tubag!')}</h1><p>{t('Your answers are saved. They will help us make Readlr better for Grade 1 learners.','Natipigan na ang imong mga tubag. Makatabang kini sa pagpaayo sa Readlr alang sa mga Grade 1 nga bata.')}</p><button className="survey-primary" onClick={onBack}>{t('Back to my adventure','Balik sa akong adventure')}<ArrowRight size={19}/></button></section>:
      step===-1?<section className="survey-welcome"><div className="survey-mascot"><CharacterCompanion state="idle" size={150} gesture="wave"/></div><p className="survey-kicker">{t('YOUR VOICE MATTERS','IMPORTANTE ANG IMONG TUBAG')}</p><h1>{t('How was your adventure?','Kumusta ang imong adventure?')}</h1><p>{t('Tell us what you think about Readlr. There are no right or wrong answers. Take your time, or skip any question.','Isulti kanamo ang imong gibati bahin sa Readlr. Walay sakto o sayop nga tubag. Ayaw pagdali, ug pwede kang molaktaw og pangutana.')}</p>
      <form onSubmit={e=>{e.preventDefault();if(section.trim())setStep(0);}}><label className="survey-section">{t('Your section','Imong seksyon')}<input required maxLength={80} value={section} onChange={e=>setSection(e.target.value)} placeholder={t('e.g. Sunflower','Pananglitan: Sunflower')}/></label><button className="survey-primary" disabled={!section.trim()}>{t('Let us begin','Magsugod na ta')}<ArrowRight size={20}/></button></form>
      <details className="survey-privacy"><summary><ShieldCheck size={17}/>{t('About your answers','Bahin sa imong mga tubag')}</summary><p>{t('Taking part is your choice. You can leave or skip any question. Your responses are linked to your Readlr account and section, and are visible to authorized research administrators. They are used to evaluate and improve Readlr for this study, not to grade you. Responses are confidential; your personal details will not be published.','Ang pag-apil imong pagpili. Pwede kang mobiya o molaktaw og pangutana. Ang imong mga tubag konektado sa imong Readlr account ug seksyon, ug makita sa awtorisadong research administrators. Gamiton kini sa pagsusi ug pagpaayo sa Readlr alang sa pagtuon, dili sa paghatag og grado. Kumpidensyal ang mga tubag; dili ipatik ang imong personal nga detalye.')}</p></details></section>:
      step===14?<section className="survey-review"><p className="survey-kicker">{t('ONE LAST LOOK','TAN-AWA PAG-USAB')}</p><h1 ref={heading} tabIndex={-1}>{t('Ready to share?','Andam na sa pagpaambit?')}</h1><p>{t('You can change any answer before sending. Skipped questions stay blank.','Pwede nimong usbon ang tubag sa dili pa ipadala. Blangko ang gilaktawang pangutana.')}</p><ol>{data.questions.map((item,i)=><li key={item.id}><div><strong>{item.id}. {item[lang]}</strong><span>{answers[i]===null?t('Skipped','Gilaktawan'):i<12?`${answers[i]} / 5 - ${data.scale[Number(answers[i])-1][lang==='en'?0:1]}`:data.choices[item.id].find(c=>c[0]===answers[i])?.[lang==='en'?1:2]}</span></div><button onClick={()=>setStep(i)}>{t('Change','Usba')}</button></li>)}</ol><button className="survey-primary" disabled={busy} onClick={submit}>{busy?t('Sending...','Gipadala...'):t('Send my answers','Ipadala akong mga tubag')}<Check size={19}/></button></section>:
      q&&<section className="survey-question" key={q.id}><div className="survey-progress"><span>{t('Question','Pangutana')} {step+1} / 14</span><span>{t('Take your time','Ayaw pagdali')}</span></div><progress max={14} value={step+1} aria-label={t('Survey progress','Dagan sa survey')}/><div className={`survey-question-art tone-${step%3}`}><span>{q.kind==='rating'?<Star size={32}/>:step===12?<Heart size={32}/>:<Gamepad2 size={32}/>}</span><p>{t(q.kind==='rating'?'READLR & YOU':step===12?'YOUR FAVORITE':'THE TRICKY PART',q.kind==='rating'?'READLR UG IKAW':step===12?'IMONG PINAKA-GANAHAN':'UNSA ANG LISOD')}</p></div><h1 ref={heading} tabIndex={-1} id="survey-question-title">{q[lang]}</h1>
      <fieldset className={q.kind==='rating'?'survey-stars':'survey-choices'} aria-labelledby="survey-question-title"><legend>{t(q.kind==='rating'?'Choose one rating':'Choose one answer',q.kind==='rating'?'Pagpili og usa ka rating':'Pagpili og usa ka tubag')}</legend>
      {q.kind==='rating'?data.scale.map((labels,i)=><label key={i} className={answers[step]===i+1?'selected':''}><input type="radio" name={`q${q.id}`} value={i+1} checked={answers[step]===i+1} onChange={()=>answer(i+1)}/><Star size={35} fill={answers[step]===i+1?'currentColor':'none'}/><strong>{i+1}</strong><span>{labels[lang==='en'?0:1]}</span></label>):data.choices[q.id].map(([value,en,ceb])=>{const Icon=icons[value]??Star;return <label key={value} className={answers[step]===value?'selected':''}><input type="radio" name={`q${q.id}`} value={value} checked={answers[step]===value} onChange={()=>answer(value)}/><Icon size={26}/><span>{lang==='en'?en:ceb}</span></label>;})}
      </fieldset><footer className="survey-actions"><button className="survey-back" onClick={()=>setStep(step-1)}><ArrowLeft size={18}/>{t('Back','Balik')}</button><button className="survey-skip" onClick={()=>{answer(null);setStep(step+1);}}>{t('Skip question','Laktawi')}</button><button className="survey-primary" disabled={answers[step]===null} onClick={()=>setStep(step+1)}>{t(step===13?'Review':'Next',step===13?'Tan-awa':'Sunod')}<ArrowRight size={18}/></button></footer></section>}
    </>}
  </main>;
}

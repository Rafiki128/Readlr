import { useState } from "react";
import { BookOpen, Mic, Trophy, Map, Search, ChevronDown, Volume2, Headphones, Heart, X } from "lucide-react";
import "./help.css";

const topics = [
  { id:"journey", title:"Your adventure", icon:Map, answers:[
    ["Where do I begin?", "Open Stages and choose Valley of Vowels. Begin chapter takes you to the Vowel Dojo. Train the five vowels, then use the Valley button to explore the trail. Return to the Dojo to practise again."],
    ["What happens in Blending Bridges?", "Train five sound teams in the Bridge Workshop. Join a consonant and a vowel, then restore fifteen bridges. After training, the Sound Shelf lets you choose a consonant and vowel, hear each sound, and blend them together. No recording is needed on the shelf."],
    ["What happens in CVC Kingdom?", "Place a vowel between two consonants, like m-a-p. Follow nineteen word challenges through the town and castle: build words, find missing letters, change sounds, and read. At the throne, use a vowel, a blend, and a whole word to restore the three crown jewels."],
    ["Why is a challenge locked?", "Complete the available training or challenge first. The next step opens as you progress. Finish the previous stage before moving to the next one."],
  ]},
  { id:"voice", title:"Sound & microphone", icon:Mic, answers:[
    ["When should I speak?", "Tap the large practice button. Listen to Milo's prompt, then wait for the listening colour and microphone cue before speaking. Your voice plays back after recording. The small speaker button replays Milo's model when it is available."],
    ["Why can't Milo hear me?", "Ask a grown-up to check microphone permission for Readlr in the browser and select the correct microphone. Find a quiet spot and record again. A quiet recording is not a wrong answer."],
    ["Why can't I hear the narration?", "Check your device volume and Readlr's volume in Settings. Tap a speaker or Listen to Milo if your browser blocked automatic sound. Check your headphones. Success narration also follows the voice-feedback setting."],
    ["Does hearing my voice mean I said it correctly?", "Not necessarily. Guided practice records your voice so you can listen back. Detecting sound does not prove correct pronunciation. Compare your voice with Milo's model and ask a teacher or grown-up if you are unsure."],
    ["Can I listen without a challenge?", "Open Sound Library from Stages for available vowel, blend, and word recordings. Collections unlock as you progress. After Workshop training, the Stage 2 Sound Shelf also lets you explore sound pairs."],
  ]},
  { id:"progress", title:"Practice & rewards", icon:Trophy, answers:[
    ["What can I see in Progress?", "My journey shows completed lessons. My Practice shows weekly recording attempts, recorded time, session history, and stage filters. My milestones shows earned rewards. Completing a lesson and having pronunciation assessed are different things."],
    ["Why does My Practice say Not assessed?", "Accuracy, fluency, and Self-Correction Stars need valid assessment evidence. A completed lesson or a detected voice is not a score. Until those measurements exist, Readlr shows Not assessed instead of inventing a percentage."],
    ["What are Self-Correction Stars?", "A star needs two assessed attempts at the same target: the first below the accuracy threshold, then the next above it, without corrective feedback between them. Simply trying again or speaking after a quiet recording does not earn an assessed star."],
    ["Where is practice history saved?", "New challenge recording attempts are saved for the signed-in learner on this browser and device. This history does not currently follow you to another device. Clearing browser data can remove it. Older completed lessons are not converted into attempts. My Practice does not store audio."],
    ["How do I collect stickers?", "Complete valley trails and stage milestones. Open Sticker Book from Stages to turn the pages and see your collection. Achievements shows reward milestones; account frames become available when their requirements are met."],
  ]},
  { id:"grownups", title:"For grown-ups", icon:Heart, answers:[
    ["How can I support a learner?", "Listen to the model together and let the child try before giving the answer. Replay their voice and celebrate their effort. Keep practice comfortable and take a break when they are tired."],
    ["How can I tell what they have learned?", "Use Progress to see what they practised, then listen as they try a sound or word without a model. Ask a teacher to help interpret their reading. Lesson completion, voice detection, and time spent are not proof of reading mastery."],
    ["What if a recording is interrupted?", "Return to the challenge and try again when ready. In Blending Bridges and CVC Kingdom, leaving the tab can pause a turn. A microphone or playback problem should not be treated as a reading mistake."],
  ]},
] as const;

export function Help() {
  const [topic,setTopic]=useState<string>("journey");
  const [query,setQuery]=useState("");
  const search=query.trim().toLowerCase();
  const selected=topics.find(item=>item.id===topic)!;
  const results=topics.flatMap(item=>item.answers.map(([question,answer])=>({question,answer,topic:item.title,id:item.id})))
    .filter(item=>search?`${item.question} ${item.answer} ${item.topic}`.toLowerCase().includes(search):item.id===topic);
  return <div className="readlr-help"><main className="help-inner">
    <header className="help-heading"><div><p className="help-eyebrow">A little help along the way</p><h1>Help & guidance</h1><p>For young readers and the grown-ups beside them.</p></div><BookOpen size={48} aria-hidden="true"/></header>
    <ol className="help-voice-flow" aria-label="Voice practice sequence">{[{icon:Volume2,title:"Listen to Milo",text:"Hear the sound first."},{icon:Mic,title:"Your turn",text:"Wait for the listening cue."},{icon:Headphones,title:"Hear your voice",text:"Listen back together."}].map(({icon:Icon,title,text},i)=><li key={title}><span className={`help-step step-${i}`}><Icon size={23}/></span><div><h2>{title}</h2><p>{text}</p></div></li>)}</ol>
    <div className="help-search"><Search size={20} aria-hidden="true"/><input aria-label="Search help" placeholder="Search sounds, stages, progress..." value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear search" title="Clear search" onClick={()=>setQuery("")}><X size={18}/></button>}</div>
    <div className="help-layout"><nav aria-label="Help topics">{topics.map(({id,title,icon:Icon})=><button key={id} aria-current={!search&&topic===id?"page":undefined} onClick={()=>{setTopic(id);setQuery("");}}><Icon size={19}/>{title}</button>)}</nav>
      <section className="help-answers" aria-label="Help answers"><header><h2>{search?"Search results":selected.title}</h2><span role="status">{results.length} answers</span></header>
        {results.length===0?<div className="help-empty"><Search size={28}/><h3>No matching answers</h3><p>Try a shorter phrase, such as microphone or progress.</p></div>:results.map(item=><details key={`${search}-${item.question}`}><summary>{item.question}<ChevronDown size={18} aria-hidden="true"/></summary><p>{item.answer}</p></details>)}
      </section></div>
    <footer><Heart size={23}/><div><h2>Still feeling stuck?</h2><p>Ask your teacher or a grown-up to help. You can take a break and come back together.</p></div></footer>
  </main></div>;
}

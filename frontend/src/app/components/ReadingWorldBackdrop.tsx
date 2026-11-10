import { useId } from 'react';
import './readingWorldScenery.css';

/** Decorative scenery only; destinations remain accessible HTML buttons. */
/** bookFocus is the home screen scene: one road ending under the book, no side paths or bridge, and bunting strung between trees. */
export function ReadingWorldBackdrop({welcome=false,theme='home',bookFocus=false}:{welcome?:boolean;theme?:string;bookFocus?:boolean}) {
  const id=useId().replace(/:/g,'');
  const road=welcome?'M520 900Q820 750 720 540':bookFocus?'M300 900Q660 780 575 640T720 515':'M310 900Q650 730 562 572T850 330';
  // Bunting hangs between a tree and a pine on each side; flags follow the sag of the string.
  const strings:[number,number,number,number,number,number][]=[[138,240,228,292,318,252],[995,252,1135,304,1272,236]];
  const along=([x0,y0,cx,cy,x1,y1]:number[],t:number)=>[(1-t)**2*x0+2*(1-t)*t*cx+t*t*x1,(1-t)**2*y0+2*(1-t)*t*cy+t*t*y1];
  return <svg className={`adventure-backdrop reading-world-scenery theme-${theme} ${welcome?'is-welcome':''}`} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <g id={`${id}-pine`}><path d="M0 10V-75" stroke="#946237" strokeWidth="12"/><path d="m0-140-44 70h24l-35 55h110L20-70h24Z" fill="#168c71"/><path d="m0-140-8 70 8 55h55L20-70h24Z" fill="#087a68"/></g>
      <g id={`${id}-flower`}><path d="M0 8v18m0-6q-15-14-15-1 6 7 15 1" fill="#168c71" stroke="#168c71" strokeWidth="3"/><g className="scenery-flower-head"><circle cy="-7" r="8"/><circle cx="8" r="8"/><circle cy="8" r="8"/><circle cx="-8" r="8"/><circle r="5" fill="#ffed87"/></g></g>
    </defs>
    <path fill={['lantern','magic','library','tower'].includes(theme)?'#d7d0fa':'#b5eff8'} d="M0 0h1440v900H0z"/>
    <g className="scenery-sun" transform="translate(1260 104)"><circle r="48" fill="#ffda5b"/><g stroke="#ffe988" strokeWidth="5" strokeLinecap="round">{Array.from({length:12},(_,i)=><path key={i} d="M0-62v-10" transform={`rotate(${i*30})`}/>)}</g></g>
    <g className="scenery-clouds" fill="#fff" opacity=".9"><path d="M60 120q-20-34 28-38 16-51 58-28 42-25 61 24 47-5 42 42Z"/><path d="M975 62q-8-27 27-30 19-35 51-9 41-12 45 39Z"/><path d="M350 48q-7-22 21-26 14-24 39-8 29-8 35 34Z"/></g>
    <path d="M0 325 130 170 260 315 392 210 558 355 787 206 986 330 1180 170 1440 330V900H0Z" fill="#73c9bd"/>
    <path d="m85 224 45-54 48 55-34-11-16 14-18-15Zm1049 1 46-55 52 55-35-10-17 14-17-14Z" fill="#d4f6ec"/>
    <path d="M0 358Q180 250 370 380T770 360 1135 340 1440 355V900H0Z" fill="#53bd91"/>
    <path d="M0 455Q220 335 442 470 686 365 937 440 1214 340 1440 430V900H0Z" fill="#a8df7b"/>
    <path d="M1440 366Q1100 401 1190 570T1120 900" stroke="#d9f3a7" strokeWidth="148" fill="none"/>
    <path d="M1440 366Q1100 401 1190 570T1120 900" stroke="#36bedc" strokeWidth="112" fill="none"/>
    <path className="scenery-current" d="M1440 366Q1100 401 1190 570T1120 900" stroke="#8be8f3" strokeWidth="6" strokeDasharray="48 90" fill="none"/>
    <path d="M0 739Q240 620 478 750T930 720 1440 775V900H0Z" fill="#64c78e"/>
    <path d={road} fill="none" stroke="#e8c67e" strokeWidth="92" strokeLinecap={bookFocus?'round':undefined}/>
    <path d={road} fill="none" stroke="#fff0be" strokeWidth="80" strokeLinecap={bookFocus?'round':undefined}/>
    {!welcome&&!bookFocus&&<path d="M565 590Q340 510 175 390M615 715Q415 715 205 735M705 416Q1010 360 1240 420" fill="none" stroke="#fff0be" strokeWidth="30" strokeLinecap="round"/>}
    {!bookFocus&&<g transform="translate(1054 535) rotate(-13)"><path d="M0 12Q83-32 166 12v54Q83 25 0 66Z" fill="#bc824f" stroke="#875737" strokeWidth="4"/><path d="M0 12Q83-32 166 12" fill="none" stroke="#ffe0a0" strokeWidth="8"/>{[8,36,64,92,120,150].map((x,i)=><path key={x} d={`M${x} ${i===0||i===5?15:0}v44`} stroke="#e3ac70" strokeWidth="5"/>)}</g>}
    <g opacity=".7">{[[30,350],[325,340],[990,340],[1400,350]].map(([x,y])=><use key={x} href={`#${id}-pine`} transform={`translate(${x} ${y}) scale(.65)`}/>)}</g>
    {[[30,530,1],[1390,560,1.15],[90,310,.75],[1320,290,.7],[20,870,1.2],[1400,870,1]].map(([x,y,s],i)=><g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cy="53" rx="60" ry="12" fill="#178e7160"/><path d="M0 50V-70m0 65-29-35M0-23l25-28" stroke="#a96e42" strokeWidth="14" fill="none" strokeLinecap="round"/>
      <g className="scenery-canopy"><path d="M-65-55q-28-50 22-73-3-45 44-45 45-5 47 42 48 12 29 62 21 38-27 49-32 17-57-2-53 15-58-33Z" fill={i%2?'#1d9e78':'#36b77b'}/><path d="M-48-84q-17-28 9-38m25-27q25-8 37 9" fill="none" stroke="#86de8a" strokeWidth="9" strokeLinecap="round"/>{[-34,0,32].map((cx,j)=><circle key={cx} cx={cx} cy={-65-j%2*48} r="10" fill={i%2?'#ffc857':'#ff8dae'}/>)}</g>
    </g>)}
    {bookFocus&&<g className="scenery-ambient">
      <g className="scenery-butterfly scenery-butterfly--a"><g className="scenery-wings"><path d="M0 0q-13-15-17 0q4 11 17 0Z" fill="#ff9ccb"/><path d="M0 0q13-15 17 0q-4 11-17 0Z" fill="#ffc857"/></g></g>
      <g className="scenery-butterfly scenery-butterfly--b"><g className="scenery-wings"><path d="M0 0q-11-13-15 0q4 9 15 0Z" fill="#9fd8ff"/><path d="M0 0q11-13 15 0q-4 9-15 0Z" fill="#c9a2ff"/></g></g>
      <g className="scenery-birds" fill="none" stroke="#3f6f78" strokeWidth="3" strokeLinecap="round"><path d="M0 0q8-7 16 0q8-7 16 0"/><path d="M38-16q6-5 12 0q6-5 12 0"/></g>
    </g>}
    {bookFocus?<g className="scenery-bunting">{strings.map((string,k)=><g key={k}><path d={`M${string[0]} ${string[1]}Q${string[2]} ${string[3]} ${string[4]} ${string[5]}`} stroke="#598d81" strokeWidth="3" fill="none"/>{[.18,.39,.61,.82].map((t,i)=>{const [x,y]=along(string,t);return <path key={t} d={`M${x-11} ${y}h22l-11 24Z`} fill={['#ffcc57','#ef77a5','#8c70d4'][(i+k)%3]}/>;})}</g>)}</g>
    :<g className="scenery-bunting"><path d="M0 180Q120 237 255 165M1185 167q130 64 255 8" stroke="#598d81" strokeWidth="3" fill="none"/>{[38,82,126,170,214,1220,1264,1308,1352,1396].map((x,i)=><path key={x} d={`m${x} ${i<5?192+Math.sin(i)*10:190} 24 3-14 29Z`} fill={['#ffcc57','#ef77a5','#8c70d4'][i%3]}/>)}</g>}
    {[90,175,340,990,1260,1360].map((x,i)=><g key={x} transform={`translate(${x} ${810+i%2*38})`}><use href={`#${id}-flower`} fill="#f56eaa"/><use href={`#${id}-flower`} transform="translate(28 8) scale(.7)" fill="#fff9e7"/><use href={`#${id}-flower`} transform="translate(-23 12) scale(.6)" fill="#ad80e7"/></g>)}
    <g fill="#fff8db" opacity=".8">{[240,430,900,1080].map((x,i)=><path key={x} d={`m${x} ${690+i%2*90} 8-3 6 5-9 4Z`}/>)}</g>
  </svg>;
}

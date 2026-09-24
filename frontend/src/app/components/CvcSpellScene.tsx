import { WordObject } from "./CvcArt";

const DESCRIPTIONS:Record<string,[string,string]> = {
  sun:["A dark, closed castle gate","Sunlight opens the castle gate"], map:["An unfinished route","A map unfolds and draws the route"],
  hen:["An empty garden path","A hen walks along the garden path"], cup:["An empty fountain","A cup pours water into the fountain"],
  rug:["Cold stone steps","A rug unrolls across the stones"], pot:["A seed without a home","A flower grows from its pot"],
  net:["Leaves blocking the water","A net lifts leaves out of the fountain"], bug:["Closed flower buds","A bug visits the blooming flowers"],
  hat:["A sunny, empty hat stand","A hat lands on its stand"], log:["A stream with no crossing","A log bridges the stream"],
  bed:["An empty guest room","A bed appears beside the window"], pen:["An unwritten royal note","A pen writes the royal note"],
  pig:["An empty picture frame","A pig fills the enchanted picture"], tin:["A silent music stand","A tin drum sends music into the room"],
  bag:["Scattered letter stones","The letter stones gather into a bag"], gem:["A dark tower staircase","A gem lights the staircase"],
  fan:["Mist covering the tower steps","A fan blows away the mist"], lid:["An open treasure box","A lid closes over the treasure"],
  top:["A quiet throne room","A top spins before the throne"],
};
function ObjectArt({word,x=130,y=15,width=150}:{word:string;x?:number;y?:number;width?:number}) {
  return <svg x={x} y={y} width={width} height={width*.8}><WordObject word={word}/></svg>;
}
export function CvcSpellScene({word,restored=false,mini=false}:{word:string;restored?:boolean;mini?:boolean}) {
  const water=["cup","net","log"].includes(word);
  const steps=["gem","fan","rug"].includes(word);
  return <svg className={`${mini?"cvc-landmark-art":"cvc-spell-scene"} spell-${word} ${restored?"is-restored":""}`} viewBox="0 0 400 190" role="img" aria-label={DESCRIPTIONS[word]?.[restored?1:0] || word}>
    <ellipse cx="205" cy="165" rx="170" ry="14" fill="#334155" opacity=".09"/>
    {water&&<><path d="M35 128Q130 98 220 130T375 125V166Q240 183 35 158Z" fill="#38bdf8"/><path className="spell-ripples" d="M60 141h40m70 15h45m70-16h50" stroke="#cffafe" strokeWidth="5" strokeLinecap="round"/></>}
    {steps&&<path d="M42 163v-20h65v-22h65V99h65V77h65V55h60v108Z" fill="#ddd6fe" stroke="white" strokeWidth="4"/>}
    {word==="sun"&&<><path d="M130 163V40h30V25h30v15h30V25h30v15h30v123Z" fill="#ddd6fe" stroke="white" strokeWidth="4"/><path d="M175 163V96a30 30 0 0 1 60 0v67" fill="#373060"/><g className="spell-gate"><path d="M175 163V96a30 30 0 0 1 60 0v67" fill="#fbbf24"/><path d="M188 90v62m17-75v75m17-62v62" stroke="#d97706" strokeWidth="4"/></g><g className="spell-reveal spell-rise"><ObjectArt word="sun" x={15} y={0} width={120}/></g></>}
    {word==="map"&&<><path d="M45 151Q90 60 178 123T350 75" fill="none" stroke="#fffbeb" strokeWidth="22"/><path className="spell-route" d="M45 151Q90 60 178 123T350 75" fill="none" stroke="#f59e0b" strokeWidth="7" pathLength="1"/><g className="spell-reveal spell-unfold"><ObjectArt word={word} x={126} y={-4}/></g></>}
    {word==="hen"&&<><path d="M30 156Q180 120 365 150" stroke="#fef3c7" strokeWidth="22" fill="none"/><g className="spell-reveal spell-walk"><ObjectArt word={word} x={125} y={32}/></g></>}
    {word==="cup"&&<><path d="M220 130h115l-20 35h-75Z" fill="#a78bfa"/><path className="spell-water" d="M200 75Q280 60 280 142" stroke="#22d3ee" strokeWidth="12" fill="none"/><g className="spell-reveal spell-pour"><ObjectArt word={word} x={102} y={-3}/></g></>}
    {word==="rug"&&<g className="spell-reveal spell-unroll"><ObjectArt word={word} x={88} y={52} width={210}/></g>}
    {word==="pot"&&<><path className="spell-seed" d="M200 150q-25-30 0-38 25 8 0 38" fill="#d97706"/><g className="spell-reveal"><ObjectArt word={word} x={125} y={30}/><g className="spell-bloom"><path d="M199 58V29" stroke="#059669" strokeWidth="6"/><circle cx="199" cy="21" r="15" fill="#f472b6"/><circle cx="199" cy="21" r="5" fill="#fef08a"/></g></g></>}
    {word==="net"&&<><g className="spell-leaves"><path d="M135 139q-25-25-45-7 20 28 45 7m65 12q-25-25-45-7 20 28 45 7m65-7q-25-25-45-7 20 28 45 7" fill="#fbbf24"/></g><g className="spell-reveal spell-scoop"><ObjectArt word={word} x={150} y={20}/></g></>}
    {word==="bug"&&<>{[65,125,270,325].map(x=><g key={x}><path d={`M${x} 156v-45`} stroke="#059669" strokeWidth="5"/><g className="spell-flower" style={{transformOrigin:`${x}px 105px`}}><circle cx={x} cy="105" r="16" fill="#f472b6"/><circle cx={x} cy="105" r="6" fill="#fef08a"/></g></g>)}<g className="spell-reveal spell-walk"><ObjectArt word={word} x={135} y={38} width={130}/></g></>}
    {word==="hat"&&<><path d="M198 77v83m-35 0h70" stroke="#a78bfa" strokeWidth="10" strokeLinecap="round"/><g className="spell-reveal spell-drop"><ObjectArt word={word} x={122} y={-12}/></g></>}
    {word==="log"&&<g className="spell-reveal spell-cross"><ObjectArt word={word} x={65} y={45} width={260}/></g>}
    {word==="bed"&&<><path d="M270 110V38h70v72Z" fill="#7dd3fc" stroke="white" strokeWidth="7"/><path d="M305 38v72m-35-36h70" stroke="white" strokeWidth="5"/><g className="spell-reveal spell-drop"><ObjectArt word={word} x={88} y={26} width={190}/></g></>}
    {word==="pen"&&<><rect x="92" y="28" width="170" height="128" rx="5" fill="#fffbeb" stroke="#fbbf24" strokeWidth="3"/><path className="spell-writing" d="M112 55h118m-118 23h95m-95 23h110m-110 23h70" stroke="#8b5cf6" strokeWidth="5" pathLength="1"/><g className="spell-reveal spell-write"><ObjectArt word={word} x={198} y={20}/></g></>}
    {word==="pig"&&<><rect x="115" y="17" width="175" height="142" rx="8" fill="#fff1f2" stroke="#fbbf24" strokeWidth="12"/><g className="spell-reveal"><ObjectArt word={word} x={127} y={27}/></g></>}
    {word==="tin"&&<><g className="spell-reveal"><ObjectArt word={word} x={126} y={36}/><g className="spell-music" fill="#8b5cf6"><path d="M93 80V32l28-6v40h-7V35l-14 3v42Z"/><circle cx="86" cy="80" r="9"/><circle cx="112" cy="66" r="9"/><path d="M296 74V30l24 12-4 8-13-7v31Z"/><circle cx="289" cy="74" r="9"/></g></g></>}
    {word==="bag"&&<><g className="spell-loose-stones" fill="#a78bfa" stroke="white" strokeWidth="3"><rect x="80" y="110" width="30" height="30" rx="5"/><rect x="295" y="80" width="30" height="30" rx="5"/><rect x="270" y="134" width="30" height="30" rx="5"/></g><g className="spell-reveal"><ObjectArt word={word} x={122} y={29}/></g></>}
    {word==="gem"&&<><g className="spell-stair-lights" fill="#fde047">{[80,145,210,275,340].map((x,i)=><circle key={x} cx={x} cy={129-i*22} r="8"/>)}</g><g className="spell-reveal spell-rise"><ObjectArt word={word} x={245} y={-10} width={115}/></g></>}
    {word==="fan"&&<><g className="spell-mist" fill="#fff" opacity=".9"><ellipse cx="145" cy="116" rx="110" ry="29"/><ellipse cx="265" cy="75" rx="90" ry="30"/></g><g className="spell-reveal spell-fan"><ObjectArt word={word} x={12} y={27}/></g></>}
    {word==="lid"&&<><rect x="139" y="91" width="125" height="65" rx="8" fill="#a78bfa"/><path d="m160 92 20-24 20 24m15 0 15-26 17 26" fill="#fde047"/><g className="spell-lid"><path d="M129 89q72-75 145 0Z" fill="#fde68a" stroke="#f59e0b" strokeWidth="5"/></g></>}
    {word==="top"&&<><path d="M270 158V47h75v111m-85-59h20m56 0h20" fill="#f9a8d4" stroke="#fbbf24" strokeWidth="9"/><g className="spell-reveal"><g className="spell-spin"><ObjectArt word={word} x={90} y={42}/></g></g></>}
  </svg>;
}

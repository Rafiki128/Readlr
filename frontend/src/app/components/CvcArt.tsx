export function CvcCrown({jewels=0}:{jewels?:number}) {
  return <svg viewBox="0 0 240 160" role="img" aria-label={`Crown with ${jewels} of 3 jewels restored`}>
    <path d="M35 115 20 40 75 72 120 20 165 72 220 40 205 115Z" fill="#fbbf24" stroke="#d97706" strokeWidth="5" strokeLinejoin="round"/>
    <rect x="35" y="115" width="170" height="25" rx="8" fill="#fde68a" stroke="#d97706" strokeWidth="5"/>
    {[65,120,175].map((x,i)=><path key={x} className={i<jewels?"cvc-jewel-lit":""} d={`M${x} 76 l12 16 -12 16 -12 -16Z`} fill={i<jewels?["#ec4899","#06b6d4","#8b5cf6"][i]:"#fff7d6"} stroke="white" strokeWidth="3"/>)}
  </svg>;
}

export function CvcCastle({small=false}:{small?:boolean}) {
  return <svg viewBox="0 0 600 390" aria-hidden="true">
    <ellipse cx="300" cy="355" rx="245" ry="24" fill="#059669" opacity=".16"/>
    <path d="M110 350V150H210V105H390V150H490V350Z" fill="#fffdf2" stroke="#a78bfa" strokeWidth="5"/>
    {[110,210,390,490].map((x,i)=><g key={x}><rect x={x-32} y={i===1||i===2?110:180} width="64" height={i===1||i===2?240:170} fill="#ddd6fe"/><path d={`M${x-45} ${i===1||i===2?110:180} l45 -72 45 72Z`} fill={i%2?"#8b5cf6":"#ec4899"}/><rect x={x-10} y={i===1||i===2?146:211} width="20" height="35" rx="10" fill="#38bdf8" stroke="white" strokeWidth="5"/></g>)}
    <path d="M258 350V273a42 42 0 0 1 84 0v77" fill="#fbbf24" stroke="#f59e0b" strokeWidth="5"/>
    <path d="M300 105V21m0 0 70 17-70 18" fill="#f9a8d4" stroke="#8b5cf6" strokeWidth="5"/>
    {!small && <g fill="#38bdf8" stroke="white" strokeWidth="5"><rect x="253" y="149" width="25" height="35" rx="12"/><rect x="322" y="149" width="25" height="35" rx="12"/></g>}
  </svg>;
}

export function WordObject({word}:{word:string}) {
  let shape;
  switch(word) {
    case "sun": shape=<><g stroke="#f59e0b" strokeWidth="7" strokeLinecap="round">{Array.from({length:8},(_,i)=><path key={i} d="M100 15v15" transform={`rotate(${i*45} 100 80)`}/>)}</g><circle cx="100" cy="80" r="35" fill="#fbbf24"/><path d="M85 87q15 15 30 0" stroke="#92400e" strokeWidth="4" fill="none"/></>; break;
    case "map": shape=<><path d="m30 30 47 10 46-10 47 10v90l-47-10-46 10-47-10Z" fill="#fef3c7" stroke="#d97706" strokeWidth="4"/><path d="M77 40v90m46-100v90" stroke="#fcd34d" strokeWidth="4"/><path d="M45 95Q65 40 102 85t50-20" stroke="#14b8a6" strokeWidth="5" strokeDasharray="7 7" fill="none"/><path d="m141 48 18 18m0-18-18 18" stroke="#ec4899" strokeWidth="5"/></>; break;
    case "cup": case "pot": case "tin": shape=<><path d="M55 45h85v65q0 25-42 25t-43-25Z" fill={word==="pot"?"#fb923c":word==="tin"?"#67e8f9":"#c4b5fd"} stroke="#fff" strokeWidth="5"/>{word==="cup"&&<path d="M140 55q45 0 0 45" fill="none" stroke="#8b5cf6" strokeWidth="10"/>}{word==="pot"&&<path d="M98 45V20m0 12q-35 0-25-22 25 0 25 22 0-22 25-22 10 22-25 22" fill="#34d399" stroke="#059669" strokeWidth="4"/>}</>; break;
    case "rug": shape=<><path d="m25 105 25-65h100l25 65-25 25H50Z" fill="#f472b6" stroke="#db2777" strokeWidth="4"/><path d="m60 58 40 12 40-12-10 45-30 12-30-12Z" fill="#fde68a"/><path d="M100 70l16 16-16 16-16-16Z" fill="#8b5cf6"/></>; break;
    case "hen": case "pig": case "bug": shape=<><ellipse cx="100" cy="90" rx="50" ry="35" fill={word==="hen"?"#fff7d6":word==="pig"?"#f9a8d4":"#fb7185"} stroke="#fff" strokeWidth="4"/><circle cx="130" cy="66" r="23" fill={word==="hen"?"#fff7d6":word==="pig"?"#f9a8d4":"#475569"}/><circle cx="137" cy="60" r="4" fill="#1f2430"/>{word==="hen"?<path d="m151 66 17 8-17 8M124 44q-12-22-2-19l8 14q8-25 12-17l-2 23" fill="#f59e0b"/>:word==="pig"?<ellipse cx="149" cy="75" rx="13" ry="10" fill="#ec4899"/>:<path d="M100 56v67m-25-45h1m15 27h1m20-26h1" stroke="#475569" strokeWidth="9" strokeLinecap="round"/>}<path d="M75 118v15m40-15v15" stroke="#d97706" strokeWidth="6"/></>; break;
    case "hat": shape=<><ellipse cx="100" cy="114" rx="70" ry="18" fill="#fbbf24"/><path d="M57 111 65 49q35-20 70 0l8 62Z" fill="#fde68a"/><path d="M62 91h76" stroke="#ec4899" strokeWidth="14"/></>; break;
    case "log": shape=<><rect x="35" y="65" width="122" height="53" rx="20" fill="#d97706"/><ellipse cx="154" cy="91" rx="21" ry="27" fill="#fde68a"/><ellipse cx="154" cy="91" rx="10" ry="16" fill="none" stroke="#b45309" strokeWidth="3"/><path d="M55 77h70M65 104h65" stroke="#92400e" strokeWidth="4"/></>; break;
    case "bed": shape=<><path d="M35 55v80m130-60v60" stroke="#8b5cf6" strokeWidth="10"/><rect x="40" y="75" width="120" height="43" rx="8" fill="#67e8f9"/><rect x="43" y="62" width="37" height="24" rx="10" fill="white"/><path d="M90 77v40" stroke="#06b6d4" strokeWidth="4"/></>; break;
    case "pen": shape=<g transform="rotate(35 100 80)"><rect x="86" y="20" width="28" height="100" rx="8" fill="#8b5cf6"/><path d="m86 116 14 29 14-29" fill="#fcd34d"/><path d="M92 142h16" stroke="#1f2430" strokeWidth="4"/><path d="M92 40h16" stroke="white" strokeWidth="5"/></g>; break;
    case "net": shape=<><path d="M85 94 55 145" stroke="#f59e0b" strokeWidth="9"/><ellipse cx="113" cy="63" rx="45" ry="38" fill="#cffafe" stroke="#06b6d4" strokeWidth="6"/><path d="M85 43v40m20-55v70m20-70v70m20-55v40M74 50h80M70 70h85M85 89h55" stroke="#22d3ee" strokeWidth="2"/></>; break;
    case "bag": shape=<><path d="M72 48V34q28-30 56 0v14" fill="none" stroke="#ec4899" strokeWidth="9"/><rect x="50" y="48" width="100" height="89" rx="16" fill="#f9a8d4"/><path d="m100 65 14 25-14 25-14-25Z" fill="#fef3c7"/></>; break;
    case "gem": shape=<><path d="m68 30-28 38 60 75 60-75-28-38Z" fill="#a78bfa" stroke="white" strokeWidth="4"/><path d="M40 68h120M68 30l10 38 22 75 22-75 10-38M78 68l22-38 22 38" fill="none" stroke="#ddd6fe" strokeWidth="3"/></>; break;
    case "fan": shape=<><path d="M100 132 25 58Q100-10 175 58Z" fill="#fb7185" stroke="#fda4af" strokeWidth="6"/><path d="m100 132-43-92m43 92V25m0 107 43-92" stroke="#fff1f2" strokeWidth="3"/></>; break;
    case "lid": shape=<><rect x="45" y="70" width="110" height="60" rx="8" fill="#a78bfa"/><path d="M35 67q65-60 130 0Z" fill="#fde68a" stroke="#f59e0b" strokeWidth="5"/><rect x="90" y="79" width="20" height="24" rx="4" fill="#fbbf24"/></>; break;
    default: shape=<><path d="M100 20v26" stroke="#8b5cf6" strokeWidth="10"/><path d="m45 65 55-28 55 28-55 70Z" fill="#fbbf24"/><path d="M46 66h108M65 92h70" stroke="#ec4899" strokeWidth="12"/></>;
  }
  return <svg viewBox="0 0 200 160" role="img" aria-label={word}>{shape}</svg>;
}

export function CastleBackdrop({area=0}:{area?:number}) {
  return <svg className="cvc-backdrop" viewBox="0 0 1000 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="1000" height="360" fill={["#d9f4ff","#dcfce7","#fce7f3","#e0f2fe"][area]}/>
    {area<2?<>
      <path d="M0 250Q220 205 500 250T1000 230V360H0Z" fill={area===0?"#bef264":"#86efac"}/>
      {area===0?<g transform="translate(775 65)"><path d="M0 60H160V235H0Z" fill="white"/><path d="M-15 65 80 0 175 65Z" fill="#ec4899" stroke="white" strokeWidth="6"/><path d="M55 235V165a25 25 0 0 1 50 0v70" fill="#fbbf24"/><path d="M15 85h30v40H15ZM115 85h30v40h-30Z" fill="#38bdf8"/><path d="M0 140H160" stroke="#f9a8d4" strokeWidth="18"/></g>:<g><path d="M60 300V100Q500-60 940 100V300" fill="#ecfdf580" stroke="white" strokeWidth="12"/><path d="M280 50V300M720 50V300M60 150H940" stroke="white" strokeWidth="8"/></g>}
      <path d="M0 320H1000" stroke="#fff" strokeWidth="8"/>
    </>:<>
      <path d="M0 300H1000V360H0Z" fill={["#bae6fd","#a7f3d0","#fbcfe8","#ddd6fe"][area]}/>
      {[120,810].map(x=><g key={x}><path d={`M${x} 270V120a55 55 0 0 1 110 0v150Z`} fill="#7dd3fc" stroke="white" strokeWidth="16"/><path d={`M${x+55} 68v202m-55-80h110`} stroke="white" strokeWidth="8"/></g>)}
      <path d="M320 0v300m360-300v300" stroke={["#93c5fd","#6ee7b7","#f9a8d4","#c4b5fd"][area]} strokeWidth="24"/>
      <path d="M0 300H1000M240 300 180 360M760 300 820 360M0 333H1000" stroke="white" strokeWidth="3" opacity=".65"/>
      {area===1&&<path d="M0 60Q500-30 1000 60M500 0V60" fill="none" stroke="white" strokeWidth="12"/>}
    </>}
  </svg>;
}

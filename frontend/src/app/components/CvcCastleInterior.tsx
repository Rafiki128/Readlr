import { CASTLE_STOPS, CASTLE_MARKER_CENTER, castleRoute } from "./cvcCastleMap";
import { CvcRoomFurnishings } from "./CvcRoomFurnishings";

export function CvcCastleInterior({completed}:{completed:number}) {
  const restored=castleRoute(completed + 1);
  return <svg className="cvc-map-art" viewBox="0 0 1000 4160" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <pattern id="castle-masonry" width="100" height="80" patternUnits="userSpaceOnUse"><path d="M0 0H100V80H0ZM50 0V40M0 40H100" fill="#ede9fe" stroke="#ddd6fe" strokeWidth="2"/></pattern>
      <pattern id="castle-tiles" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M0 0H80V80H0Z" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="2"/><path d="m40 33 7 7-7 7-7-7Z" fill="#fff" fillOpacity=".6"/></pattern>
    </defs>
    <path d="M0 0H1000V4160H0Z" fill="url(#castle-masonry)"/>
    {[{y:380,color:"#d9f99d",rim:"#84cc16"},{y:1270,color:"#bbf7d0",rim:"#34d399"},{y:2160,color:"#fce7f3",rim:"#f472b6"},{y:3050,color:"#ede9fe",rim:"#a78bfa"}].map((floor,i)=><g key={floor.y}>
      <path d={`M45 ${floor.y}H955V${floor.y+880}H45Z`} fill={floor.color} stroke="white" strokeWidth="8"/>
      {i>1?<path d={`M45 ${floor.y}H955V${floor.y+880}H45Z`} fill="url(#castle-tiles)"/>:<path d={`M45 ${floor.y+650}Q250 ${floor.y+490} 500 ${floor.y+700}T955 ${floor.y+660}V${floor.y+880}H45Z`} fill={i===0?"#bef264":"#86efac"}/>}
      <path d={`M65 ${floor.y+16}H935M65 ${floor.y+864}H935`} stroke={floor.rim} strokeWidth="6"/>
      {i>1&&[90,830].map(x=><g key={x} transform={`translate(${x} ${floor.y+170})`}>
        <path d="M0 150V45a40 40 0 0 1 80 0v105Z" fill="#fff" stroke="#c4b5fd" strokeWidth="7"/>
        <path d="M10 140V45a30 30 0 0 1 60 0v95Z" fill={i===1?"#a7f3d0":"#bae6fd"}/>
        <path d="M40 15V140M10 75H70" stroke="white" strokeWidth="6"/>
        <path d="M-10 155H90" stroke={floor.rim} strokeWidth="10"/>
      </g>)}
      {[70,920].map(x=><g key={x} transform={`translate(${x} ${floor.y+570})`}>
        <path d="M0 0H10V45H0Z" fill="#a78bfa"/><path d="M-9 0H19L15-30H-5Z" fill={completed>i*5?"#fde047":"#cbd5e1"} stroke="white" strokeWidth="3"/>
      </g>)}
    </g>)}
    {[{x:100,y:630,pink:true},{x:790,y:800,pink:false},{x:80,y:1460,pink:false},{x:790,y:1600,pink:true}].map(house=><g key={house.y} transform={`translate(${house.x} ${house.y})`}>
      <ellipse cx="55" cy="152" rx="80" ry="15" fill="#065f4615"/>
      <path d="M88 5V-55H106V20" fill="#c4b5fd" stroke="white" strokeWidth="4"/>
      <path d="M0 30 60-40 120 30V145H0Z" fill="#fffbeb" stroke="white" strokeWidth="6"/>
      <path d="M-15 40Q20 15 60-62Q100 15 135 40L119 49Q91 27 60-30Q28 27 1 49Z" fill={house.pink?"#db2777":"#7c3aed"} stroke="white" strokeWidth="4"/>
      <path d="M23 17H97M33 0H87M44-19H76" stroke={house.pink?"#f9a8d4":"#c4b5fd"} strokeWidth="3"/>
      <path d="M3 52H117M3 90H117M3 142H117M8 40V142M112 40V142M60-25V53M8 55 37 88M112 55 83 88" fill="none" stroke="#6d4778" strokeWidth="6"/>
      <path d="M42 142V109a18 18 0 0 1 36 0v33Z" fill="#fbbf24" stroke="#6d4778" strokeWidth="4"/>
      <path d="M50 108v30M59 96v42M68 108v30" stroke="#d97706" strokeWidth="2"/><circle cx="69" cy="121" r="3" fill="#6d4778"/>
      {[17,83].map(x=><g key={x}><path d={`M${x} 80V65a10 10 0 0 1 20 0v15Z`} fill="#38bdf8" stroke="#6d4778" strokeWidth="3"/><path d={`M${x+10} 57v23m-10-10h20`} stroke="white" strokeWidth="2"/><path d={`M${x-3} 85h26`} stroke="#ec4899" strokeWidth="5"/></g>)}
      <path d="M36 150H84" stroke="#c4b5fd" strokeWidth="7"/>
    </g>)}
    {[350,2080].map((y,index)=><g key={y}>
      <path d={`M45 ${y}H390V${y+72}H45ZM610 ${y}H955V${y+72}H610Z`} fill="#c4b5fd" stroke="white" strokeWidth="5"/>
      {[100,260,680,840].map(x=><path key={x} d={`M${x} ${y-30}h55v50h-55Z`} fill="#a78bfa" stroke="white" strokeWidth="4"/>)}
      <path d={`M390 ${y+72}V${y-15}Q500 ${y-110} 610 ${y-15}V${y+72}`} fill="none" stroke="#a78bfa" strokeWidth="24"/>
      <path d={`M500 ${y-64}v-75l64 15-64 16`} fill="#f472b6" stroke="#8b5cf6" strokeWidth="5"/>
      {index===1&&<path d={`M410 ${y+65}V${y-10}Q500 ${y-80} 590 ${y-10}V${y+65}Z`} fill={completed>=10?"#faf5ff":"#64748b"}/>}
    </g>)}
    <CvcRoomFurnishings completed={completed}/>
    <path d={castleRoute(20)} fill="none" stroke="white" strokeWidth="66" vectorEffect="non-scaling-stroke"/>
    <path d={castleRoute(20)} fill="none" stroke="#cbd5e1" strokeWidth="48" vectorEffect="non-scaling-stroke"/>
    {restored&&<><path d={restored} fill="none" stroke="#fbbf24" strokeWidth="48" vectorEffect="non-scaling-stroke"/><path className="cvc-road-flow" d={restored} fill="none" stroke="#fff9" strokeWidth="3" vectorEffect="non-scaling-stroke"/></>}
    {[4,9,14].map(index=>{const from=CASTLE_STOPS[index],to=CASTLE_STOPS[index+1];return <g key={index}>{Array.from({length:7},(_,step)=>{const t=(step+1)/8;const x=from.x*10+(to.x-from.x)*10*(3*t*t-2*t*t*t);const y=from.y+CASTLE_MARKER_CENTER+(to.y-from.y)*t;return <path key={step} d={`M${x-18} ${y}h36`} stroke="white" strokeWidth="4"/>;})}</g>;})}
    <g transform="translate(600 4050) scale(.7)"><path d="M-180 70H180L145 40H-145Z" fill="#c4b5fd"/><path d="M-145 40H145L115 15H-115Z" fill="#ddd6fe"/><path d="M-70 15V-85Q0-155 70-85V15Z" fill="#f472b6" stroke="#fbbf24" strokeWidth="10"/><path d="M-90-20V35H90V-20M-65 35V60M65 35V60" fill="none" stroke="#fbbf24" strokeWidth="14"/></g>
  </svg>;
}

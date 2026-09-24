// Furniture stays in the side alcoves, outside the playable route.
export function CvcRoomFurnishings({completed}:{completed:number}) {
  return <g className="cvc-room-furnishings" pointerEvents="none">
    <g transform="translate(795 2200)">
      <path d="M8 0H112V122H8Z" fill="#fbbf24" stroke="white" strokeWidth="5"/>
      <path d="M20 12H100V110H20Z" fill="#e0f2fe"/>
      <path d="M32 88 37 52 60 65 83 52 88 88Z" fill="#f59e0b"/>
      <path d="m47 57 13-25 13 25" fill="#fbbf24"/><circle cx="60" cy="78" r="7" fill="#ec4899"/>
      <path d="M42-4 60-22 78-4" fill="none" stroke="#a78bfa" strokeWidth="4"/>
    </g>
    <g transform="translate(785 2510)">
      <ellipse cx="65" cy="164" rx="76" ry="12" fill="#83184312"/>
      <path d="M0 0Q65-30 130 0V150H0Z" fill="#fff7ed" stroke="#9d6ca6" strokeWidth="8"/>
      {[0,1].map(row=><g key={row} transform={`translate(12 ${20+row*65})`}>
        {["#f472b6","#38bdf8","#fbbf24","#34d399","#a78bfa"].map((color,i)=><g key={color} transform={`translate(${i*21} ${i%2?8:0})`}><rect width="16" height={i%2?35:43} rx="2" fill={color}/><path d="M4 8H12M4 27H12" stroke="white" strokeWidth="2"/></g>)}
        <path d="M-9 47H109" stroke="#9d6ca6" strokeWidth="7"/>
      </g>)}
      <path d="M10 150V165M120 150V165" stroke="#9d6ca6" strokeWidth="9"/>
    </g>
    <g transform="translate(90 2625)">
      <ellipse cx="62" cy="128" rx="76" ry="17" fill="#f9a8d4"/>
      <path d="M24 84V22Q62-8 100 22V84" fill="#67e8f9" stroke="#0e7490" strokeWidth="6"/>
      <path d="M12 64V105H112V64M28 105V128M96 105V128" fill="none" stroke="#0e7490" strokeWidth="9"/>
      <rect x="27" y="72" width="71" height="26" rx="8" fill="#a5f3fc"/>
      <path d="M45 40H78V64H45Z" fill="#fef08a" stroke="white" strokeWidth="3"/>
    </g>
    <g transform="translate(780 2880)">
      <ellipse cx="70" cy="112" rx="80" ry="12" fill="#83184312"/>
      <path d="M10 40H130L140 64H0Z" fill="#c4b5fd" stroke="white" strokeWidth="4"/>
      <path d="M15 65V109M125 65V109" stroke="#8b5cf6" strokeWidth="9"/>
      <path d="M35 32Q53 23 70 32Q87 23 105 32V53Q87 44 70 53Q53 44 35 53Z" fill="#fffdf5" stroke="#a78bfa" strokeWidth="3"/>
      <path d="M70 32V53" stroke="#c4b5fd" strokeWidth="2"/>
      <path d="M15 35V10M3 10H27L23-15H7Z" fill="#fde68a" stroke="#d97706" strokeWidth="3"/>
    </g>
    <g transform="translate(790 3400)">
      <ellipse cx="65" cy="122" rx="72" ry="14" fill="#7c3aed12"/>
      <path d="M8 93H122L113 114H17Z" fill="#a78bfa" stroke="white" strokeWidth="4"/>
      <path d="M17 90V52L36 22 54 52V90M49 92V25L71-12 92 25V92M86 93V60L105 32 123 60V93" fill={completed>=16?"#67e8f9":"#c4b5fd"} stroke="white" strokeWidth="4"/>
      <path d="M71-12V90M36 22V88M105 32V90" stroke="white" strokeWidth="2"/>
    </g>
    <g transform="translate(90 3560)">
      <ellipse cx="65" cy="113" rx="75" ry="14" fill="#7c3aed12"/>
      <path d="M0 40Q0 0 40 0H90Q130 0 130 40V100H0Z" fill="#38bdf8" stroke="#0e7490" strokeWidth="5"/>
      <path d="M0 40H130M26 4V100M104 4V100" stroke="#fde68a" strokeWidth="8"/>
      <path d="M53 32H78V59H53Z" fill="#fbbf24" stroke="white" strokeWidth="3"/><circle cx="65" cy="42" r="4" fill="#0e7490"/>
    </g>
    {[{x:95,y:3820},{x:810,y:3820}].map(({x,y})=><g key={x} transform={`translate(${x} ${y})`}>
      <path d="M0 0H85V135L43 161 0 135Z" fill="#ec4899" stroke="white" strokeWidth="4"/>
      <path d="M-10-7H95" stroke="#fbbf24" strokeWidth="8"/>
      <path d="m43 34 21 30-21 31-21-31Z" fill={completed===20?"#fde047":"#fbcfe8"} stroke="white" strokeWidth="3"/>
      <path d="M10 119H75" stroke="#fbbf24" strokeWidth="4"/>
    </g>)}
  </g>;
}

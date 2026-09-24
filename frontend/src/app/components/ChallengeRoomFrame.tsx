export function ChallengeRoomFrame({kind}:{kind:"bridge"|"cvc"}) {
  return <svg className={`challenge-room-frame challenge-room-frame--${kind}`} viewBox="0 0 1000 340" preserveAspectRatio="none" aria-hidden="true">
    {kind==="bridge"?<>
      <path d="M22 305V45Q22 24 44 24H956Q978 24 978 45V305" fill="none" stroke="#cffafe" strokeWidth="22"/>
      <path d="M22 297V52m956 0v245" stroke="#0891b2" strokeWidth="10"/>
      <path d="M22 87 68 41m910 46-46-46" stroke="#22d3ee" strokeWidth="10" strokeLinecap="round"/>
      {[22,978].map(x=><g key={x} fill="#fbbf24" stroke="white" strokeWidth="3"><circle cx={x} cy="90" r="9"/><circle cx={x} cy="262" r="9"/></g>)}
      <path d="M18 310Q500 359 982 310" fill="none" stroke="#0891b2" strokeWidth="12"/>
      <path d="M28 306Q500 348 972 306" fill="none" stroke="#a5f3fc" strokeWidth="9"/>
    </>:<>
      <path d="M17 321V115Q17 14 175 14H825Q983 14 983 115V321" fill="none" stroke="#ede9fe" strokeWidth="25"/>
      <path d="M17 321V115Q17 14 175 14H825Q983 14 983 115V321" fill="none" stroke="#a78bfa" strokeWidth="6"/>
      <path d="M38 314V120Q38 35 179 35H821Q962 35 962 120V314" fill="none" stroke="#fbbf24" strokeWidth="3"/>
      {[100,900].map(x=><g key={x}><path d={`M${x} 67l12 16-12 16-12-16Z`} fill="#f9a8d4" stroke="white" strokeWidth="3"/><path d={`M${x} 108v38`} stroke="#c4b5fd" strokeWidth="3"/></g>)}
      <path d="M20 321Q500 354 980 321" fill="none" stroke="#c4b5fd" strokeWidth="13"/>
      <path d="M30 318Q500 343 970 318" fill="none" stroke="#fef3c7" strokeWidth="6"/>
    </>}
  </svg>;
}

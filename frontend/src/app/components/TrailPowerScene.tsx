import { motion, useReducedMotion } from "motion/react";

export function TrailPowerScene({ title, vowel, active }: { title: string; vowel: string; active: boolean }) {
  const reduced = useReducedMotion();
  const transition = { duration: reduced ? 0 : 1.15, delay: reduced ? 0 : 0.1 };
  const color = ({ A: "#F59E0B", E: "#EC4899", I: "#06B6D4", O: "#8B5CF6", U: "#10B981" })[vowel] ?? "#F59E0B";
  const bridge = title.includes("Bridge");
  const gate = title.includes("Gate") || title === "Moon Door";
  return <svg className="trail-power-scene" viewBox="0 0 280 170" role="img" aria-label={`${title}: ${active ? "Milo's power has cleared the way" : "waiting for your vowel power"}`}>
    <path d="M0 155Q100 110 280 144V170H0Z" fill="#BDEBB2" />
    <path d="M15 160Q130 110 266 151" fill="none" stroke="#FFF7D6" strokeWidth="20" />
    {bridge && <path d="M10 146Q140 113 270 143" fill="none" stroke="#38BDF8" strokeWidth="32" />}
    {gate ? <>
      <path d="M80 141V57Q140 0 200 57V141" fill="#BFE9CE" stroke="#6F9A86" strokeWidth="12" />
      <motion.g animate={{ x: active ? 82 : 0, opacity: active ? 0.15 : 1 }} transition={transition}>
        <path d="M89 139V62Q140 14 191 62V139Z" fill={color} stroke="#fff" strokeWidth="5" />
        <path d="M140 44V137M102 85H178" stroke="#fff" strokeWidth="4" opacity=".6" />
        <circle cx="165" cy="109" r="6" fill="#FFF7D6" />
      </motion.g>
    </> : title === "Branch Wall" ? <motion.g animate={{ x: active ? 75 : 0, y: active ? 28 : 0, opacity: active ? 0 : 1 }} transition={transition} stroke="#A87F52" strokeWidth="13" strokeLinecap="round">
      <path d="M76 134L195 54M91 56L191 139M75 97L203 107" /><path d="M100 100L83 72M153 82L182 77" strokeWidth="8" />
    </motion.g> : title === "Rolling Stone" || title === "Stone Step" || title === "Updraft Path" ? <motion.g animate={{ x: active && title === "Rolling Stone" ? 100 : 0, y: active && title !== "Rolling Stone" ? -43 : 0, rotate: active && title === "Rolling Stone" ? 95 : 0 }} transition={transition} style={{ transformOrigin: "140px 110px" }}>
      <path d={title === "Rolling Stone" ? "M100 130Q75 88 115 67Q164 41 184 96Q195 147 140 149Z" : "M86 106L107 91H174L198 108V137H86Z"} fill="#B3AECF" stroke="#8B82B0" strokeWidth="5" />
      <path d="M112 102L132 88H156" fill="none" stroke="#EEE9FF" strokeWidth="6" strokeLinecap="round" />
    </motion.g> : bridge ? <motion.g animate={{ y: active ? -15 : title === "Low Bridge" ? 18 : 0, rotate: active ? 0 : title === "Needle Bridge" ? -9 : 0 }} transition={transition} style={{ transformOrigin: "140px 125px" }}>
      <path d="M65 128H218M65 92Q140 113 218 92" fill="none" stroke="#AF8353" strokeWidth="8" />
      {[70, 98, 126, 154, 182, 210].map(x => <path key={x} d={`M${x} 97V132`} stroke="#E4BD7F" strokeWidth="8" />)}
    </motion.g> : title === "Rainy Shield" ? <>
      <motion.g animate={{ opacity: active ? 0.15 : 1 }} transition={transition} stroke="#38BDF8" strokeWidth="4" strokeLinecap="round">{[70, 100, 130, 160, 190, 220].map(x => <path key={x} d={`M${x} 30l-8 20M${x - 8} 75l-8 20`} />)}</motion.g>
      <motion.path d="M63 120Q140 11 217 120Z" fill="#6EE7B7" stroke="#10B981" strokeWidth="5" initial={false} animate={{ opacity: active ? 0.85 : 0, y: active ? -18 : 24 }} transition={transition} />
    </> : title === "Missing Map Line" || title === "Tiny Clue" ? <>
      <path d="M70 41L113 50L163 36L207 48V137L163 125L113 142L70 129Z" fill="#FFFEF5" stroke="#CABF98" strokeWidth="4" />
      <motion.path d="M90 114Q152 121 128 81T187 60" fill="none" stroke={color} strokeWidth={title === "Tiny Clue" ? 9 : 6} strokeLinecap="round" strokeDasharray="8 10" initial={false} animate={{ opacity: active ? 1 : 0.08, pathLength: active ? 1 : 0.05 }} transition={transition} />
    </> : <>
      {title === "Blinking Sign" && <><path d="M141 151V64" stroke="#A87F52" strokeWidth="10" /><path d="M87 57H176L204 82L176 105H87Z" fill="#fff" stroke="#C8C0A8" strokeWidth="4" /></>}
      {[95, 139, 182].map((x, index) => <motion.g key={x} initial={false} animate={{ opacity: active ? 1 : 0.12, y: active ? -8 : 0 }} transition={{ ...transition, delay: reduced ? 0 : index * 0.2 }}>
        <path d={`M${x} 69l5 12 13 1-10 9 3 13-11-7-11 7 3-13-10-9 13-1Z`} fill={color} stroke="#fff" strokeWidth="2" />
      </motion.g>)}
    </>}
    {active && !reduced && <motion.path d="M15 111Q65 80 110 102" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: 0 }} transition={{ duration: 1 }} />}
    {active && <motion.path d="M218 51l9 9 19-22" fill="none" stroke="#10B981" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduced ? 0 : 1 }} />}
  </svg>;
}

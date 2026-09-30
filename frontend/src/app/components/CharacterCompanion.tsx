import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { CharacterState, MiloGesture, MiloLook } from "./miloBehavior";

export type { CharacterState } from "./miloBehavior";

interface CharacterCompanionProps {
  state: CharacterState;
  phoneme?: string;
  size?: number;
  gesture?: MiloGesture;
  lookAt?: MiloLook;
  cueKey?: string | number;
  reducedMotion?: boolean;
}

// Expressive cues, not an anatomical demonstration of mouth positioning.
const mouths: Record<string, [number, number]> = {
  A: [15, 15], E: [18, 8], I: [19, 6], O: [12, 14], U: [10, 12],
};

export function CharacterCompanion({ state, phoneme, size = 320, gesture = "rest", lookAt = "viewer", cueKey, reducedMotion = false }: CharacterCompanionProps) {
  const id = useId().replace(/:/g, "");
  const prefersReduced = useReducedMotion();
  const reduced = prefersReduced || reducedMotion;
  const portrait = size <= 96;
  const speaking = state === "speaking";
  const happy = state === "celebrating";
  const listening = state === "listening";
  const thinking = state === "thinking";
  const encouraging = state === "encouraging";
  const joining = gesture === "join";
  const pointing = gesture === "point";
  const revealing = gesture === "reveal";
  const waving = gesture === "wave" || encouraging;
  const glance = lookAt === "right" ? { x: 4, y: 0 } : lookAt === "down-right" ? { x: 3, y: 3 } : lookAt === "down" ? { x: 0, y: 4 } : thinking ? { x: 2, y: -3 } : { x: 0, y: 0 };
  const leftArm = joining ? -60 : happy || revealing ? 65 : 0;
  const rightArm = joining ? 60 : pointing ? -100 : listening ? -135 : thinking ? 55 : revealing ? -75 : waving || happy ? -125 : speaking ? -25 : 0;
  const [mouthX, mouthY] = mouths[phoneme?.toUpperCase() ?? ""] ?? [16, 10];
  const fill = (name: string) => `url(#${id}-${name})`;

  return <div className="relative milo-companion" data-state={state} data-gesture={gesture} data-look={lookAt} style={{ width: size, height: size, flexShrink: 0 }}>
    <svg viewBox={portrait ? "36 6 228 228" : "8 0 284 296"} width="100%" height="100%" role="img" aria-label={`Milo, your reading buddy, ${state}`} style={{ display: "block", overflow: "hidden" }}>
      <defs>
        <radialGradient id={`${id}-fur`} cx="32%" cy="24%" r="85%">
          <stop offset="0" stopColor="#b896ff"/><stop offset=".55" stopColor="#8b4ff0"/><stop offset="1" stopColor="#6430b7"/>
        </radialGradient>
        <radialGradient id={`${id}-body`} cx="35%" cy="20%" r="85%">
          <stop offset="0" stopColor="#a576f5"/><stop offset="1" stopColor="#7138c5"/>
        </radialGradient>
        <radialGradient id={`${id}-face`} cx="40%" cy="25%" r="85%">
          <stop offset="0" stopColor="#fffdf1"/><stop offset="1" stopColor="#ffe8ac"/>
        </radialGradient>
      </defs>
      {!portrait&&<motion.ellipse cx="150" cy="279" rx="73" ry="10" fill="#305d50" opacity=".13" animate={{ rx: happy && !reduced ? [73, 61, 73] : 73 }} transition={{ duration: .7, repeat: happy && !reduced ? 2 : 0 }}/>}
      <motion.g
        animate={reduced || listening || thinking ? { y: 0, rotate: 0, scaleY: 1 } : happy ? { y: [0, -10, 0], rotate: [0, -2, 0], scaleY: 1 } : speaking ? { y: 0, rotate: [0, -1, 0, 0], scaleY: 1 } : { y: 0, rotate: 0, scaleY: [1, 1.012, 1] }}
        style={{ transformOrigin: "150px 272px" }}
        transition={{ duration: reduced ? 0 : happy ? .7 : speaking ? 2.8 : 3.8, repeat: reduced || listening || thinking ? 0 : happy ? 2 : Infinity, ease: "easeInOut" }}>
        {/* Feet and a pear-shaped body anchor Milo to the floor. */}
        <ellipse cx="119" cy="265" rx="27" ry="15" fill={fill("body")} transform="rotate(-8 119 265)"/>
        <ellipse cx="181" cy="265" rx="27" ry="15" fill={fill("body")} transform="rotate(8 181 265)"/>
        <path d="M113 168 Q87 193 94 239 Q99 266 150 267 Q201 266 206 239 Q213 193 187 168Z" fill={fill("body")}/>
        <ellipse cx="150" cy="225" rx="34" ry="33" fill={fill("face")}/>
        <path d="M107 230 Q103 207 115 199" stroke="#cda6ff" opacity=".5" strokeWidth="4" fill="none" strokeLinecap="round"/>
        <motion.g animate={{ rotate: listening ? -7 : thinking ? 7 : reduced ? 0 : encouraging ? [0, 4, 0] : lookAt === "right" || lookAt === "down-right" ? 4 : speaking ? [0, -2, 0] : 0, y: joining ? 2 : 0, scale: 1.06 }} style={{ transformOrigin: "150px 169px" }} transition={{ duration: reduced ? 0 : encouraging ? .8 : .5, repeat: encouraging && !reduced ? 1 : 0 }}>
          <ellipse cx="91" cy="64" rx="26" ry="29" fill={fill("fur")} transform="rotate(-20 91 64)"/>
          <ellipse cx="91" cy="64" rx="15" ry="18" fill="#ffa4d3" transform="rotate(-20 91 64)"/>
          <ellipse cx="209" cy="64" rx="26" ry="29" fill={fill("fur")} transform="rotate(20 209 64)"/>
          <ellipse cx="209" cy="64" rx="15" ry="18" fill="#ffa4d3" transform="rotate(20 209 64)"/>
          <path d="M62 121 C61 64 101 48 150 48 C199 48 239 64 238 121 C240 172 205 192 150 192 C95 192 60 172 62 121Z" fill={fill("fur")}/>
          <path d="M91 117 C93 96 118 91 150 100 C182 91 207 96 209 117 C227 151 202 178 150 180 C98 178 73 151 91 117Z" fill={fill("face")}/>
          <path d="M126 57 Q139 45 157 56 Q153 45 166 51" stroke="#dbc9f5" strokeWidth="6" fill="none" strokeLinecap="round"/>
          <ellipse cx="97" cy="146" rx="14" ry="8" fill="#f58bb5" opacity=".65"/>
          <ellipse cx="203" cy="146" rx="14" ry="8" fill="#f58bb5" opacity=".65"/>
          <motion.g animate={{ y: listening || encouraging ? -4 : speaking && !reduced ? [0, -3, 0, 0] : 0 }} transition={{ duration: reduced ? 0 : 2.1, repeat: speaking && !reduced ? Infinity : 0 }} fill="none" stroke="#653396" strokeWidth="3.5" strokeLinecap="round">
            <path d="M104 102 Q116 95 128 101"/><path d={state === "thinking" ? "M173 99 Q185 99 196 105" : "M173 101 Q185 95 196 102"}/>
          </motion.g>
          <motion.g animate={reduced || happy ? { scaleY: 1 } : { scaleY: [1, 1, .12, 1, 1] }} transition={{ duration: reduced ? 0 : 5.2, times: [0, .87, .9, .93, 1], repeat: reduced || happy ? 0 : Infinity }} style={{ transformOrigin: "150px 126px" }}>
            {happy ? <g fill="none" stroke="#483755" strokeWidth="5" strokeLinecap="round"><path d="M106 127 Q117 114 128 127"/><path d="M172 127 Q183 114 194 127"/></g> : <>
              <ellipse cx="117" cy="125" rx="17" ry="20" fill="#fff"/>
              <ellipse cx="183" cy="125" rx="17" ry="20" fill="#fff"/>
              <motion.g animate={glance} transition={{ duration: reduced ? 0 : .35 }}>
                <ellipse cx="118" cy="127" rx="12" ry="15" fill="#392356"/>
                <ellipse cx="182" cy="127" rx="12" ry="15" fill="#392356"/>
                <circle cx="114" cy="122" r="4.5" fill="#fff"/><circle cx="178" cy="122" r="4.5" fill="#fff"/>
                <circle cx="122" cy="132" r="2" fill="#b4a1e2"/><circle cx="186" cy="132" r="2" fill="#b4a1e2"/>
              </motion.g>
            </>}
          </motion.g>
          <path d="M143 140 Q150 136 157 140 Q156 147 150 148 Q144 147 143 140" fill="#786084"/>
          {speaking ? <motion.g animate={{ scaleY: reduced ? 1 : [1, .35, .85, .5, 1, .25, 1] }} transition={{ duration: reduced ? 0 : 1.1, repeat: reduced ? 0 : Infinity }} style={{ transformOrigin: "150px 153px" }}>
              <ellipse cx="150" cy="159" rx={mouthX} ry={mouthY} fill="#59334f"/>
              <ellipse cx="150" cy={159 + mouthY * .48} rx={mouthX * .55} ry={mouthY * .27} fill="#f592b4"/>
            </motion.g>
            : <path d={happy ? "M135 155 Q150 177 165 155 Q150 161 135 155" : "M137 155 Q150 168 163 155"} fill={happy ? "#91617c" : "none"} stroke="#785365" strokeWidth="3.5" strokeLinecap="round"/>}
        </motion.g>
        {/* A small mint neckerchief keeps the face and body visually distinct. */}
        <path d="M117 181 Q150 194 183 181 L178 195 Q150 207 122 195Z" fill="#2dd4af"/>
        <path d="M160 198 L177 216 L178 194Z" fill="#0b9e89"/>
        <ellipse cx="163" cy="196" rx="7" ry="6" fill="#9df5cf"/>
        {/* Foreground hands make teaching actions visible instead of hiding behind the head. */}
        <motion.g animate={{ rotate: leftArm, x: joining ? 39 : 0, y: joining ? -6 : 0 }} style={{ transformOrigin: "104px 193px" }} transition={{ duration: reduced ? 0 : .65 }}>
          <ellipse cx="92" cy="214" rx="17" ry="30" fill={fill("fur")} transform="rotate(20 92 214)"/>
          <ellipse cx="84" cy="232" rx="10" ry="8" fill="#cfb9eb"/>
          <path d="M78 226 L78 231 M85 225 L85 230" stroke="#9770c4" strokeWidth="2" strokeLinecap="round"/>
        </motion.g>
        <motion.g key={`${gesture}-${cueKey ?? ""}`} initial={false}
          animate={{ rotate: waving && !reduced ? [rightArm, rightArm - 18, rightArm, rightArm - 12, rightArm] : rightArm, x: joining ? -39 : thinking ? -30 : 0, y: joining ? -6 : thinking ? -12 : 0 }}
          style={{ transformOrigin: "197px 192px" }} transition={{ duration: reduced ? 0 : waving ? 1.4 : .65, repeat: 0 }}>
          <ellipse cx="208" cy="214" rx="17" ry="30" fill={fill("fur")} transform="rotate(-20 208 214)"/>
          <ellipse cx="216" cy="232" rx="10" ry="8" fill="#cfb9eb"/>
          <path d="M212 225 L212 230 M219 226 L219 231" stroke="#9770c4" strokeWidth="2" strokeLinecap="round"/>
        </motion.g>
      </motion.g>
      {listening&&<g stroke="#55ad98" strokeWidth="3" fill="none" strokeLinecap="round"><path d="M248 103 Q257 114 248 125"/><path d="M257 95 Q272 114 257 133"/></g>}
    </svg>
  </div>;
}

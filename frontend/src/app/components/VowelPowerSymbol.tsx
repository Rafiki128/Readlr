import { Shield, Sparkles, Eye, Circle, Wind } from "lucide-react";
import type { CSSProperties } from "react";
import "./vowelPowerSymbol.css";

const POWERS = {
  A: { icon: Shield, color: "#F59E0B" },
  E: { icon: Sparkles, color: "#EC4899" },
  I: { icon: Eye, color: "#06B6D4" },
  O: { icon: Circle, color: "#8B5CF6" },
  U: { icon: Wind, color: "#10B981" },
};

export function VowelPowerSymbol({ vowel }: { vowel: string }) {
  const power = POWERS[vowel as keyof typeof POWERS] ?? POWERS.A;
  const Icon = power.icon;
  return <span className="vowel-power-symbol" style={{ "--power-color": power.color } as CSSProperties} aria-hidden="true">
    <Icon /><b>{vowel.toLowerCase()}</b>
  </span>;
}

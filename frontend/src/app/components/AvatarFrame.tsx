import { useId } from "react";

interface RingProps {
  size: number;
}

function GradientRing({
  gradientId,
  from,
  to,
  strokeWidth = 5,
}: {
  gradientId: string;
  from: string;
  to: string;
  strokeWidth?: number;
}) {
  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <circle
        cx="50"
        cy="50"
        r={48 - strokeWidth / 2}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
      />
    </>
  );
}

function SunriseRing({ size }: RingProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0 pointer-events-none">
      <GradientRing gradientId={id} from="#FEF3E2" to="#FBD3C8" />
    </svg>
  );
}

function IndigoClassicRing({ size }: RingProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0 pointer-events-none">
      <GradientRing gradientId={id} from="#6366F1" to="#4338CA" />
    </svg>
  );
}

const FRAME_RINGS: Record<string, (props: RingProps) => React.ReactElement> = {
  "sunrise-ring": SunriseRing,
  "indigo-classic": IndigoClassicRing,
};

interface AvatarFrameProps {
  assetKey?: string | null;
  size?: number;
  children: React.ReactNode;
}

// Frames without an SVG ring are image frames served from public/frames/<assetKey>.png.
export function AvatarFrame({ assetKey, size = 80, children }: AvatarFrameProps) {
  const Ring = assetKey ? FRAME_RINGS[assetKey] : undefined;
  const isImageFrame = !!assetKey && !Ring;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute rounded-full flex items-center justify-center bg-[var(--paper-deep)] overflow-hidden border-2 border-[var(--hairline)]"
        style={{ inset: size * (isImageFrame ? 0.18 : 0.09) }}
      >
        {children}
      </div>
      {Ring && <Ring size={size} />}
      {isImageFrame && (
        <img
          src={`/frames/${assetKey}.png`}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      )}
    </div>
  );
}

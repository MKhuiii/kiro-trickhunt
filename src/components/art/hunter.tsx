import type { CSSProperties, ReactElement } from "react";

/**
 * The hunter in six poses (hunter-ui design B3). Decorative only: no text, no title,
 * no filter, no animate. Colors come only from the `--th-*` tokens. Fine details
 * sit in groups whose data-part ends with `-detail` (hidden in high contrast).
 * Each pose changes the arms, the head and the lantern shape, not only color.
 */

export const HUNTER_POSES = ["idle", "tracking", "lantern", "reading", "aiming", "downcast"] as const;
export type HunterPose = (typeof HUNTER_POSES)[number];

export interface HunterProps {
  readonly pose?: string;
  readonly className?: string;
}

const fill = (token: string, opacity?: number): CSSProperties =>
  opacity === undefined
    ? { fill: `var(--th-${token})` }
    : { fill: `var(--th-${token})`, fillOpacity: opacity };

const stroke = (token: string, opacity?: number): CSSProperties =>
  opacity === undefined
    ? { stroke: `var(--th-${token})`, fill: "none" }
    : { stroke: `var(--th-${token})`, strokeOpacity: opacity, fill: "none" };

const stop = (token: string, opacity?: number): CSSProperties =>
  opacity === undefined
    ? { stopColor: `var(--th-${token})` }
    : { stopColor: `var(--th-${token})`, stopOpacity: opacity };

const grad = (id: string): CSSProperties => ({ fill: `url(#th-hunter-${id})` });

/* ---------- Shared pieces ---------- */

const HEM_DY: readonly number[] = [0, 5, 1, 6, 0, 5, 2, 6, 0, 5, 1, 6, 0];
const HEM_Y = 170;

function cloakPath(sh: number): string {
  const x0 = 42;
  const x1 = 158;
  const hem = HEM_DY.map((dy, i) => `L${(x0 + (i * (x1 - x0)) / 12).toFixed(1)} ${HEM_Y + dy}`).join(" ");
  return `M72 ${76 + sh}C58 ${90 + sh} 50 125 ${x0} ${HEM_Y}${hem}C150 125 142 ${90 + sh} 128 ${76 + sh}Z`;
}

interface LanternSpec {
  readonly x: number;
  readonly y: number;
  readonly s: number;
  /** Flame size, 0 to 1. */
  readonly flame: number;
  /** Glow opacity, 0 to 1. */
  readonly glow: number;
}

function Lantern({ x, y, s, flame, glow }: LanternSpec): ReactElement {
  return (
    <g data-part="lantern" transform={`translate(${x} ${y}) scale(${s})`}>
      <g data-part="lantern-detail">
        <circle className="th-flicker" cx="0" cy="22" r="30" style={grad("glow")} opacity={glow} />
        <circle cx="-7" cy="13" r="1.2" style={fill("parchment-border")} />
        <circle cx="7" cy="13" r="1.2" style={fill("parchment-border")} />
        <path d="M0 13V31" strokeWidth="1" style={stroke("stone", 0.6)} />
        <path d="M-9 35l-2 3M9 35l2 3" strokeWidth="1.5" strokeLinecap="round" style={stroke("stone")} />
      </g>
      <path d="M-6 9Q0-8 6 9" strokeWidth="2" strokeLinecap="round" style={stroke("stone")} />
      <path d="M-8 9H8L5 13H-5Z" style={fill("stone")} />
      <path d="M-6 13H6L7 31H-7Z" style={grad("lamp")} />
      <g transform={`translate(0 29) scale(${flame})`}>
        <path d="M0-16C7-8 7-1 0 0C-7-1-7-8 0-16Z" style={fill("lantern")} />
        <path d="M0-11C4-6 4-1 0 0C-4-1-4-6 0-11Z" style={fill("moon", 0.85)} />
        <path d="M0-5C2-3 2-1 0 0C-2-1-2-3 0-5Z" style={fill("parchment-text")} />
      </g>
      <path d="M-7 13V31M7 13V31" strokeWidth="1.8" style={stroke("stone")} />
      <path d="M-9 31H9V35H-9Z" style={fill("stone")} />
    </g>
  );
}

interface CrossbowSpec {
  readonly transform: string;
  /** Slung behind the shoulder: drawn before the cloak. */
  readonly back: boolean;
}

function Crossbow({ transform }: CrossbowSpec): ReactElement {
  return (
    <g data-part="crossbow" transform={transform}>
      <path d="M-32-2H16L22 0L16 2H-32L-35 0Z" style={grad("leather")} />
      <path d="M-14-2H4V2H-14Z" style={fill("stone", 0.7)} />
      <path d="M-35-3L-28-4V4L-35 3Z" style={fill("parchment")} />
      <path d="M18-27Q38 0 18 27" strokeWidth="4" strokeLinecap="round" style={stroke("parchment")} />
      <path d="M18-27L9 0L18 27" strokeWidth="1.2" style={stroke("parchment-text", 0.9)} />
      <path d="M-8 0H34" strokeWidth="1.6" strokeLinecap="round" style={stroke("parchment-text")} />
      <path d="M34-3L42 0L34 3Z" style={fill("stone")} />
      <path d="M-8 0l-4-3M-8 0l-4 3" strokeWidth="1.2" style={stroke("moon", 0.8)} />
      <g data-part="crossbow-detail">
        <path d="M-30-1H12" strokeWidth="0.8" style={stroke("moon", 0.35)} />
        <path d="M17-20Q30 0 17 20" strokeWidth="0.8" style={stroke("moon", 0.35)} />
        <circle cx="-2" cy="0" r="1.4" style={fill("parchment-border")} />
        <circle cx="10" cy="0" r="1.4" style={fill("parchment-border")} />
        <path d="M14-4V4" strokeWidth="1.5" style={stroke("stone")} />
      </g>
    </g>
  );
}

interface ArmsSpec {
  readonly sleeves: readonly string[];
  readonly gloves: readonly (readonly [number, number])[];
  readonly extra?: ReactElement;
}

function Glove({ x, y }: { readonly x: number; readonly y: number }): ReactElement {
  return (
    <g>
      <ellipse cx={x} cy={y} rx="6.5" ry="7.5" style={grad("leather")} />
      <ellipse cx={x + 5} cy={y - 1} rx="2.4" ry="4" style={grad("leather")} />
    </g>
  );
}

function Arms({ sleeves, gloves, extra }: ArmsSpec): ReactElement {
  return (
    <g data-part="arms">
      {sleeves.map((d) => (
        <path key={d} d={d} style={grad("sleeve")} />
      ))}
      {extra}
      {gloves.map(([x, y]) => (
        <Glove key={`${x}-${y}`} x={x} y={y} />
      ))}
      <g data-part="arms-detail">
        {gloves.map(([x, y]) => (
          <path
            key={`c${x}-${y}`}
            d={`M${x - 7} ${y - 8}H${x + 7}`}
            strokeWidth="2"
            strokeLinecap="round"
            style={stroke("parchment-border", 0.9)}
          />
        ))}
        {sleeves.map((d) => (
          <path key={`r${d}`} d={d} strokeWidth="0.8" style={stroke("moon", 0.2)} />
        ))}
        {gloves.map(([x, y]) => (
          <path
            key={`k${x}-${y}`}
            d={`M${x - 3} ${y + 1}H${x + 3}M${x - 3} ${y + 4}H${x + 3}`}
            strokeWidth="0.8"
            style={stroke("parchment", 0.7)}
          />
        ))}
      </g>
    </g>
  );
}

function Hat(): ReactElement {
  return (
    <g data-part="hat">
      <ellipse cx="100" cy="56" rx="46" ry="9" style={grad("brim")} />
      <path d="M79 56C79 38 84 27 100 25C116 27 121 38 121 56C110 61 90 61 79 56Z" style={grad("hat")} />
      <path d="M79.5 50C90 55 110 55 120.5 50L121 56C110 61 90 61 79 56Z" style={grad("leather")} />
      <rect x="104" y="50" width="10" height="9" rx="1.5" strokeWidth="2" style={stroke("parchment-border")} />
      <path d="M109 52V57" strokeWidth="1.5" style={stroke("parchment-text")} />
      <g data-part="hat-detail">
        <path d="M60 58Q100 68 140 58" strokeWidth="0.9" strokeDasharray="3 3" style={stroke("stone", 0.7)} />
        <path d="M90 30Q100 37 110 30" strokeWidth="1.2" style={stroke("sky", 0.7)} />
        <path d="M84 42C86 35 90 31 96 28" strokeWidth="1.2" strokeLinecap="round" style={stroke("moon", 0.35)} />
        <path d="M56 52Q54 56 58 60" strokeWidth="1.2" strokeLinecap="round" style={stroke("stone", 0.8)} />
        <path d="M144 52Q146 56 142 60" strokeWidth="1.2" strokeLinecap="round" style={stroke("stone", 0.8)} />
        <path d="M82 52C92 57 108 57 118 52" strokeWidth="0.8" style={stroke("parchment-text", 0.4)} />
      </g>
    </g>
  );
}

function Head({ eyes }: { readonly eyes: boolean }): ReactElement {
  return (
    <g data-part="head">
      <path d="M70 88Q100 106 130 88L126 80Q100 94 74 80Z" style={grad("sleeve")} />
      <path d="M76 66C76 50 124 50 124 66L128 86C118 96 82 96 72 86Z" style={grad("cloak")} />
      <ellipse cx="100" cy="73" rx="14" ry="13" style={fill("sky")} />
      <g data-part="head-detail">
        {eyes ? (
          <g>
            <circle cx="94" cy="73" r="1.7" style={fill("lantern")} />
            <circle cx="106" cy="73" r="1.7" style={fill("lantern")} />
          </g>
        ) : null}
        <path d="M91 82Q100 89 109 82" strokeWidth="1.2" strokeLinecap="round" style={stroke("lantern", 0.5)} />
        <path d="M80 68C80 58 90 54 98 54" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.25)} />
        <path d="M78 76C78 84 82 90 88 92" strokeWidth="1" style={stroke("sky", 0.7)} />
      </g>
    </g>
  );
}

function Cloak({ sh }: { readonly sh: number }): ReactElement {
  return (
    <g data-part="cloak">
      <path d={cloakPath(sh)} style={grad("cloak")} />
      <g data-part="cloak-detail">
        <path d="M88 96C84 130 80 150 76 172" strokeWidth="1.6" strokeLinecap="round" style={stroke("sky", 0.6)} />
        <path d="M100 100C100 130 100 152 100 174" strokeWidth="1.6" strokeLinecap="round" style={stroke("sky", 0.5)} />
        <path d="M112 96C116 130 120 150 124 172" strokeWidth="1.6" strokeLinecap="round" style={stroke("sky", 0.6)} />
        <path d="M92 98C90 128 86 150 84 170" strokeWidth="1" style={stroke("stone", 0.5)} />
        <path d="M116 98C119 128 123 150 126 170" strokeWidth="1" style={stroke("stone", 0.5)} />
        <path d="M142 92C150 120 154 148 158 170" strokeWidth="1.4" strokeLinecap="round" style={stroke("lantern", 0.35)} />
        <path d="M58 150l3 6M70 156l-1 7M132 156l1 7M146 150l-2 6" strokeWidth="1" strokeLinecap="round" style={stroke("sky", 0.6)} />
      </g>
    </g>
  );
}

function Belt(): ReactElement {
  return (
    <g data-part="belt">
      <path d="M53 122Q100 132 147 122L148 131Q100 141 52 131Z" style={grad("leather")} />
      <path d="M68 132H84V146Q76 150 68 146Z" style={grad("leather")} />
      <rect x="93" y="126" width="14" height="11" rx="2" strokeWidth="2" style={stroke("parchment-border")} />
      <g data-part="belt-detail">
        <path d="M56 124Q100 134 144 124" strokeWidth="0.8" strokeDasharray="2 2" style={stroke("parchment-text", 0.5)} />
        <path d="M68 136H84" strokeWidth="0.8" strokeDasharray="2 2" style={stroke("parchment-text", 0.5)} />
        <circle cx="76" cy="140" r="1.3" style={fill("parchment-border")} />
        <path d="M100 128V135" strokeWidth="1.2" style={stroke("parchment-text")} />
      </g>
    </g>
  );
}

function Boots(): ReactElement {
  return (
    <g data-part="boots">
      <path d="M60 164H84V184C84 190 80 193 72 193H56C52 193 52 188 56 186L60 184Z" style={grad("leather")} />
      <path d="M140 164H116V184C116 190 120 193 128 193H144C148 193 148 188 144 186L140 184Z" style={grad("leather")} />
      <g data-part="boots-detail">
        <path d="M60 180H84M140 180H116" strokeWidth="1.5" style={stroke("parchment-border", 0.8)} />
        <path d="M58 191H80M142 191H120" strokeWidth="1" style={stroke("sky", 0.6)} />
      </g>
    </g>
  );
}

/* ---------- Poses ---------- */

interface PoseSpec {
  /** Transform of the whole head (hat and hood): tilt and bow. */
  readonly head: string;
  readonly eyes: boolean;
  /** Shoulder drop for a slumped cloak. */
  readonly slump: number;
  readonly arms: ArmsSpec;
  readonly lantern: LanternSpec;
  readonly crossbow: CrossbowSpec;
}

const SLEEVE_L_DOWN = "M66 90C56 110 54 135 58 152L71 153C71 135 73 112 77 94Z";

const PAPER = (
  <g data-part="paper">
    <path d="M86 108L114 106L116 132L84 134Z" style={fill("parchment-text")} />
    <path d="M90 114H110M90 120H112M90 126H106" strokeWidth="1" strokeLinecap="round" style={stroke("parchment", 0.7)} />
  </g>
);

const POSES: Readonly<Record<HunterPose, PoseSpec>> = {
  idle: {
    head: "",
    eyes: true,
    slump: 0,
    arms: {
      sleeves: [SLEEVE_L_DOWN, "M134 90C148 110 152 135 148 152L135 153C134 135 130 112 124 94Z"],
      gloves: [[64, 158], [142, 158]],
    },
    lantern: { x: 146, y: 164, s: 0.85, flame: 0.8, glow: 0.8 },
    crossbow: { transform: "translate(112 104) rotate(-62) scale(0.95)", back: true },
  },
  tracking: {
    head: "translate(4 4) rotate(8 100 84)",
    eyes: true,
    slump: 2,
    arms: {
      sleeves: [
        "M66 90C54 112 48 138 50 156L63 158C65 138 70 114 77 94Z",
        "M134 90C148 104 146 124 130 134L124 124C134 116 134 106 124 96Z",
      ],
      gloves: [[56, 162], [124, 132]],
    },
    lantern: { x: 54, y: 168, s: 0.8, flame: 0.9, glow: 0.7 },
    crossbow: { transform: "translate(100 134) rotate(18) scale(0.9)", back: false },
  },
  lantern: {
    head: "translate(0 -1) rotate(-6 100 84)",
    eyes: true,
    slump: 0,
    arms: {
      sleeves: [SLEEVE_L_DOWN, "M128 90C144 86 154 76 157 62L145 58C142 70 134 78 122 82Z"],
      gloves: [[64, 158], [151, 54]],
    },
    lantern: { x: 151, y: 58, s: 1.3, flame: 1, glow: 1 },
    crossbow: { transform: "translate(112 104) rotate(-62) scale(0.95)", back: true },
  },
  reading: {
    head: "translate(0 3) rotate(10 100 84)",
    eyes: false,
    slump: 1,
    arms: {
      sleeves: [
        "M64 92C58 112 66 130 90 134L94 122C78 120 74 108 76 96Z",
        "M136 92C142 112 134 130 110 134L106 122C122 120 126 108 124 96Z",
      ],
      gloves: [[90, 130], [110, 130]],
      extra: PAPER,
    },
    lantern: { x: 152, y: 142, s: 0.7, flame: 0.8, glow: 0.6 },
    crossbow: { transform: "translate(112 104) rotate(-62) scale(0.95)", back: true },
  },
  aiming: {
    head: "translate(3 0) rotate(-4 100 84)",
    eyes: true,
    slump: 0,
    arms: {
      sleeves: [
        "M68 92C80 80 120 90 158 96L158 108C118 108 84 106 66 108Z",
        "M132 90C142 96 140 106 128 110L122 100C128 98 128 94 126 92Z",
      ],
      gloves: [[160, 102], [126, 106]],
    },
    lantern: { x: 58, y: 150, s: 0.75, flame: 0.7, glow: 0.6 },
    crossbow: { transform: "translate(150 96) scale(1.1)", back: false },
  },
  downcast: {
    head: "translate(0 6) rotate(16 100 84)",
    eyes: false,
    slump: 6,
    arms: {
      sleeves: [
        "M68 98C60 116 58 138 60 154L72 155C72 138 74 118 78 102Z",
        "M132 98C140 116 142 138 140 154L128 155C128 138 126 118 122 102Z",
      ],
      gloves: [[66, 160], [134, 160]],
    },
    lantern: { x: 66, y: 166, s: 0.7, flame: 0.4, glow: 0.3 },
    crossbow: { transform: "translate(140 158) rotate(95) scale(0.8)", back: false },
  },
};

function resolvePose(pose: string | undefined): HunterPose {
  return pose !== undefined && Object.prototype.hasOwnProperty.call(POSES, pose) ? (pose as HunterPose) : "idle";
}

/** The hunter. An unknown pose falls back to `idle`. */
export function Hunter({ pose, className }: HunterProps): ReactElement {
  const name = resolvePose(pose);
  const spec = POSES[name];
  const crossbow = <Crossbow {...spec.crossbow} />;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      data-pose={name}
    >
      <defs>
        <linearGradient id="th-hunter-cloak" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={stop("ground")} />
          <stop offset="0.5" style={stop("foliage")} />
          <stop offset="1" style={stop("stone")} />
        </linearGradient>
        <linearGradient id="th-hunter-sleeve" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={stop("foliage")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <linearGradient id="th-hunter-hat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("stone")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <linearGradient id="th-hunter-brim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={stop("ground")} />
          <stop offset="0.6" style={stop("stone")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <linearGradient id="th-hunter-leather" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("parchment-border", 0.9)} />
          <stop offset="1" style={stop("parchment")} />
        </linearGradient>
        <radialGradient id="th-hunter-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("lantern", 0.55)} />
          <stop offset="1" style={stop("lantern", 0)} />
        </radialGradient>
        <radialGradient id="th-hunter-lamp" cx="0.5" cy="0.8" r="0.7">
          <stop offset="0" style={stop("moon")} />
          <stop offset="0.5" style={stop("lantern")} />
          <stop offset="1" style={stop("lantern", 0.6)} />
        </radialGradient>
      </defs>
      <g data-part="shadow-detail">
        <ellipse cx="100" cy="193" rx="52" ry="5" style={fill("sky", 0.5)} />
      </g>
      <Boots />
      {spec.crossbow.back ? crossbow : null}
      <Cloak sh={spec.slump} />
      <Belt />
      <Lantern {...spec.lantern} />
      {spec.crossbow.back ? null : crossbow}
      <Arms {...spec.arms} />
      <g transform={spec.head || undefined}>
        <Head eyes={spec.eyes} />
        <Hat />
      </g>
    </svg>
  );
}

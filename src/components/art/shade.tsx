import type { CSSProperties, ReactElement } from "react";

/**
 * The Shade (hunter-ui design B3): a black silhouette with ragged edges, two
 * glowing eyes and trailing wisps, in three running poses. Decorative only: no
 * text, no title, no filter, no animate. Colors come only from the `--th-ground`,
 * `--th-lantern` and `--th-fog` tokens. Fine details sit in `-detail` groups
 * (hidden in high contrast).
 */

export const SHADE_POSES = ["run1", "run2", "run3"] as const;
export type ShadePose = (typeof SHADE_POSES)[number];

export interface ShadeProps {
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

const grad = (id: string): CSSProperties => ({ fill: `url(#th-shade-${id})` });

interface PoseShape {
  /** Whole-body lean. */
  readonly lean: string;
  /** Hooded torso and head with a ragged hem and trailing cloak. */
  readonly body: string;
  /** Rim light along the leading (right) edge. */
  readonly rim: string;
  /** Ragged claws and legs (stretching, tucked, or mid-stride). */
  readonly limbs: string;
  /** Wisps trailing behind (left). */
  readonly wisps: readonly string[];
  /** Eye centers. */
  readonly eyes: readonly [readonly [number, number], readonly [number, number]];
  /** Eye shape radii. */
  readonly eyeR: readonly [number, number];
  /** Ragged ground-contact smudge and dust. */
  readonly dust: string;
  /** Shading/tear marks inside the body. */
  readonly tears: string;
}

const SHAPES: Readonly<Record<ShadePose, PoseShape>> = {
  // Stretched stride, leaning forward, one claw reaching.
  run1: {
    lean: "rotate(-6 100 120)",
    body:
      "M128 44C148 46 160 62 156 82C154 94 160 100 172 108L158 110L168 122L150 120" +
      "C142 136 126 146 112 150L100 166L92 152L78 170L70 150L52 160L60 140L34 138" +
      "L58 126C50 100 70 52 128 44Z",
    rim: "M128 44C148 46 160 62 156 82C154 94 160 100 172 108",
    limbs:
      "M112 150L136 176L150 174L140 184L118 184L100 160ZM76 152L58 178L44 182L50 168L66 148Z",
    wisps: [
      "M56 100C40 96 28 104 14 98C28 94 40 88 58 90",
      "M52 120C36 124 26 118 8 126C24 112 38 112 54 112",
      "M64 78C50 70 40 74 28 64C44 64 52 62 66 66",
    ],
    eyes: [[132, 74], [148, 76]],
    eyeR: [6, 3.5],
    dust: "M62 190C80 186 110 188 150 190L120 194Z",
    tears: "M96 100L108 112L96 118M120 126L130 138",
  },
  // Gathered stride, body low, both legs tucked, arms swept back.
  run2: {
    lean: "rotate(-2 100 120)",
    body:
      "M118 54C140 54 152 70 148 90C146 100 150 108 160 116L146 118L152 130L136 128" +
      "C130 142 116 150 100 152L88 150L80 160L68 150L50 156L56 140L30 136" +
      "L52 124C46 96 62 58 118 54Z",
    rim: "M118 54C140 54 152 70 148 90C146 100 150 108 160 116",
    limbs:
      "M100 152L112 170L128 172L122 182L100 180L84 164ZM74 156L64 172L52 170L60 160Z",
    wisps: [
      "M50 96C36 108 22 104 10 116C20 98 34 90 52 88",
      "M46 122C30 130 20 126 6 138C16 120 32 116 48 114",
      "M72 70C62 56 50 58 42 44C58 48 66 52 76 60",
    ],
    eyes: [[122, 82], [138, 84]],
    eyeR: [5, 5],
    dust: "M56 184C80 180 120 182 150 186L110 190Z",
    tears: "M90 106L102 116L90 124M112 130L120 140",
  },
  // Leaping: whole shape airborne, arms thrown forward, tail long.
  run3: {
    lean: "rotate(-10 100 110)",
    body:
      "M138 36C160 38 172 56 166 76C164 86 172 92 186 96L170 102L182 112L162 112" +
      "C154 128 136 138 120 140L108 150L100 138L84 148L82 132L56 136L70 122" +
      "L38 112L68 108C60 80 80 40 138 36Z",
    rim: "M138 36C160 38 172 56 166 76C164 86 172 92 186 96",
    limbs:
      "M120 140L150 150L166 146L158 158L134 160L108 150ZM84 142L64 156L52 150L66 138Z",
    wisps: [
      "M62 90C44 80 30 88 12 78C30 74 46 70 66 74",
      "M54 110C36 112 22 106 6 112C22 98 40 98 56 100",
      "M70 60C54 50 44 54 30 40C48 42 60 44 74 50",
    ],
    eyes: [[142, 62], [160, 66]],
    eyeR: [6.5, 3],
    dust: "M70 176C90 174 120 175 140 178L108 182Z",
    tears: "M100 90L114 100L102 108M126 116L136 126",
  },
};

function resolvePose(pose: string | undefined): ShadePose {
  return pose !== undefined && Object.prototype.hasOwnProperty.call(SHAPES, pose) ? (pose as ShadePose) : "run1";
}

/** The running Shade. An unknown pose falls back to `run1`. */
export function Shade({ pose, className }: ShadeProps): ReactElement {
  const name = resolvePose(pose);
  const s = SHAPES[name];
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
        <linearGradient id="th-shade-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("fog")} />
          <stop offset="0.45" style={stop("ground")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <linearGradient id="th-shade-wisp" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" style={stop("fog", 0.8)} />
          <stop offset="1" style={stop("fog", 0)} />
        </linearGradient>
        <radialGradient id="th-shade-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("lantern", 0.85)} />
          <stop offset="1" style={stop("lantern", 0)} />
        </radialGradient>
      </defs>
      <g data-part="dust-detail">
        <path d={s.dust} style={fill("fog", 0.4)} />
      </g>
      <g transform={s.lean}>
        <g data-part="wisps">
          {s.wisps.map((d) => (
            <path key={d} d={d} style={grad("wisp")} />
          ))}
          <g data-part="wisps-detail">
            {s.wisps.map((d, i) => (
              <path
                key={d}
                d={d}
                transform={`translate(${-6 - i * 3} ${4 - i * 3})`}
                strokeWidth="0.8"
                strokeLinecap="round"
                style={stroke("fog", 0.5)}
              />
            ))}
          </g>
        </g>
        <g data-part="body">
          <path d={s.limbs} style={fill("ground")} />
          <path d={s.body} style={grad("body")} />
          <path d={s.rim} strokeWidth="2" strokeLinecap="round" style={stroke("fog", 0.9)} />
          <g data-part="body-detail">
            <path d={s.tears} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" style={stroke("fog", 0.55)} />
            <path d={s.limbs} strokeWidth="0.8" style={stroke("fog", 0.4)} />
          </g>
        </g>
        <g data-part="eyes">
          {s.eyes.map(([cx, cy]) => (
            <g key={cx}>
              <circle cx={cx} cy={cy} r="11" style={grad("glow")} />
              <ellipse cx={cx} cy={cy} rx={s.eyeR[0]} ry={s.eyeR[1]} style={fill("lantern")} />
            </g>
          ))}
          <g data-part="eyes-detail">
            {s.eyes.map(([cx, cy]) => (
              <circle key={cx} cx={cx + 1.5} cy={cy - 0.5} r="1.2" style={fill("ground")} />
            ))}
          </g>
        </g>
      </g>
    </svg>
  );
}

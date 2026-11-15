import type { CSSProperties, ReactElement } from "react";

/**
 * The hunter's bag (hunter-ui design B3): rough cloth bag with stitches, flap and
 * clasp (closed and open), a rolled paper with creases, and a photo frame with a
 * torn corner. Decorative only: no text, no title, no filter, no animate. Colors
 * come only from the `--th-*` tokens. Fine details sit in `-detail` groups
 * (hidden in high contrast).
 */

export const BAG_POSES = ["closed", "open", "paper", "photo"] as const;
export type BagPose = (typeof BAG_POSES)[number];

export interface BagProps {
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

const grad = (id: string): CSSProperties => ({ fill: `url(#th-bag-${id})` });

const SACK = "M62 92C40 118 36 160 58 182C80 192 120 192 142 182C164 160 160 118 138 92Z";

function Shadow(): ReactElement {
  return (
    <g data-part="shadow-detail">
      <ellipse cx="100" cy="186" rx="60" ry="7" style={fill("sky", 0.55)} />
    </g>
  );
}

/** Cloth body with seams, patch and stitches. */
function Sack({ open }: { readonly open: boolean }): ReactElement {
  return (
    <g data-part="sack">
      <path d={SACK} style={grad("cloth")} />
      <path d="M62 92C48 112 42 140 48 164C44 140 52 112 70 96Z" style={fill("moon", 0.12)} />
      <path d="M138 92C158 118 162 160 142 182C152 160 150 120 132 96Z" style={fill("ground", 0.45)} />
      {open ? <ellipse cx="100" cy="92" rx="38" ry="9" style={fill("ground")} /> : null}
      <g data-part="sack-detail">
        <path d="M100 100V184" strokeWidth="1.2" strokeDasharray="4 3" style={stroke("parchment-text", 0.45)} />
        <path d="M96 106l8 0M96 116l8 0M96 126l8 0M96 136l8 0M96 146l8 0M96 156l8 0M96 166l8 0" strokeWidth="1" strokeLinecap="round" style={stroke("parchment-text", 0.45)} />
        <path d="M54 150C66 154 74 156 84 154" strokeWidth="1" style={stroke("stone", 0.7)} />
        <path d="M60 128C70 132 80 132 88 128" strokeWidth="1" style={stroke("stone", 0.6)} />
        <path d="M116 140C124 144 134 144 144 138" strokeWidth="1" style={stroke("stone", 0.6)} />
        <path d="M112 164h24v16h-24z" strokeWidth="1.2" strokeDasharray="3 2" style={stroke("parchment-border", 0.8)} />
        <path d="M114 166l20 12M134 166l-20 12" strokeWidth="0.8" style={stroke("parchment-border", 0.5)} />
        <path d="M58 100C50 120 48 150 58 176" strokeWidth="0.8" style={stroke("moon", 0.3)} />
      </g>
    </g>
  );
}

/** Rope tie and clasp around the neck. */
function Strap({ y }: { readonly y: number }): ReactElement {
  return (
    <g data-part="clasp" transform={`translate(0 ${y})`}>
      <path d="M64 0Q100 8 136 0L136 8Q100 16 64 8Z" style={grad("leather")} />
      <rect x="92" y="1" width="16" height="14" rx="2" strokeWidth="2.5" style={stroke("parchment-border")} />
      <circle cx="100" cy="8" r="2" style={fill("lantern")} />
      <g data-part="clasp-detail">
        <path d="M66 4Q100 12 134 4" strokeWidth="0.8" strokeDasharray="2 2" style={stroke("parchment-text", 0.5)} />
        <path d="M95 3L97 5" strokeWidth="0.8" style={stroke("moon", 0.6)} />
      </g>
    </g>
  );
}

/** Closed bag: neck gathered, flap folded over and buckled. */
function Closed(): ReactElement {
  return (
    <g>
      <Sack open={false} />
      <g data-part="flap">
        <path d="M58 86C58 70 70 62 100 62C130 62 142 70 142 86L142 112Q100 134 58 112Z" style={grad("leather")} />
        <path d="M58 112Q100 134 142 112L142 118Q100 140 58 118Z" style={fill("ground", 0.55)} />
        <g data-part="flap-detail">
          <path d="M64 108Q100 128 136 108" strokeWidth="1" strokeDasharray="3 2.5" style={stroke("parchment-text", 0.6)} />
          <path d="M66 76C76 70 88 68 100 68" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.3)} />
          <path d="M76 90l4 4M120 94l4 -4M100 82l0 6" strokeWidth="0.8" style={stroke("stone", 0.7)} />
        </g>
      </g>
      <Strap y={110} />
    </g>
  );
}

/** Open bag: flap thrown back, mouth gaping, a scroll and a corner peeking out. */
function Open(): ReactElement {
  return (
    <g>
      <g data-part="flap">
        <path d="M66 62C66 44 80 36 100 36C120 36 134 44 134 62L130 84Q100 76 70 84Z" style={grad("leather")} />
        <g data-part="flap-detail">
          <path d="M72 66Q100 74 128 66" strokeWidth="1" strokeDasharray="3 2.5" style={stroke("parchment-text", 0.6)} />
          <path d="M76 52C84 44 94 42 104 42" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.3)} />
        </g>
      </g>
      <g data-part="contents">
        <rect x="84" y="62" width="14" height="42" rx="7" transform="rotate(-10 91 83)" style={grad("paper")} />
        <path d="M108 100L112 70L132 74L128 104Z" style={grad("paper")} />
        <g data-part="contents-detail">
          <path d="M88 66l-3 28" strokeWidth="0.8" style={stroke("parchment-border", 0.7)} />
          <path d="M114 78L128 80M113 86L127 88" strokeWidth="0.8" style={stroke("parchment-border", 0.6)} />
        </g>
      </g>
      <Sack open />
      <path d="M62 92C70 98 130 98 138 92L138 98C128 106 72 106 62 98Z" style={grad("cloth")} />
      <Strap y={96} />
    </g>
  );
}

/** Rolled paper with curled ends, creases and ruled lines. */
function Paper(): ReactElement {
  return (
    <g>
      <g data-part="paper">
        <path d="M44 70Q100 54 156 70L152 150Q100 166 48 150Z" style={grad("paper")} />
        <path d="M44 70Q34 80 44 92Q50 80 48 72Z" style={fill("parchment-border")} />
        <path d="M156 150Q168 142 158 132Q150 142 152 150Z" style={fill("parchment-border")} />
        <path d="M44 70Q100 54 156 70L156 76Q100 62 44 76Z" style={fill("moon", 0.5)} />
        <path d="M48 150Q100 166 152 150L152 156Q100 172 48 156Z" style={fill("ground", 0.55)} />
        <g data-part="paper-detail">
          <path d="M58 96H142M58 108H138M58 120H142M58 132H122" strokeWidth="1.6" strokeLinecap="round" style={stroke("ground", 0.55)} />
          <path d="M100 62C96 88 104 120 98 158" strokeWidth="0.9" style={stroke("stone", 0.7)} />
          <path d="M72 66C78 100 70 130 76 154" strokeWidth="0.8" style={stroke("stone", 0.5)} />
          <path d="M130 68C126 96 134 126 128 154" strokeWidth="0.8" style={stroke("stone", 0.5)} />
          <path d="M48 86l10 6M152 112l-10-4" strokeWidth="0.8" style={stroke("stone", 0.6)} />
        </g>
      </g>
      <g data-part="ribbon">
        <path d="M86 56Q100 52 114 56L116 164Q100 170 84 164Z" style={grad("leather")} />
        <path d="M100 110l-12 24l8 -2l-2 14M100 110l12 24l-8 -2l2 14" strokeWidth="2" strokeLinejoin="round" style={stroke("parchment-border")} />
        <g data-part="ribbon-detail">
          <path d="M90 60V160M110 60V160" strokeWidth="0.7" strokeDasharray="2 2" style={stroke("parchment-text", 0.5)} />
        </g>
      </g>
    </g>
  );
}

/** Wooden photo frame with a landscape and a torn corner. */
function Photo(): ReactElement {
  return (
    <g>
      <g data-part="frame" transform="rotate(-4 100 100)">
        <path d="M38 40H162V160H38Z" style={grad("leather")} />
        <path d="M50 52H150V148H50Z" style={fill("ground")} />
        <g data-part="frame-detail">
          <path d="M38 40H162V44H38ZM38 156H162V160H38Z" style={fill("moon", 0.22)} />
          <path d="M42 44V156M158 44V156" strokeWidth="0.8" strokeDasharray="3 3" style={stroke("parchment-text", 0.45)} />
          <circle cx="44" cy="46" r="1.6" style={fill("parchment-border")} />
          <circle cx="156" cy="46" r="1.6" style={fill("parchment-border")} />
          <circle cx="44" cy="154" r="1.6" style={fill("parchment-border")} />
        </g>
      </g>
      <g data-part="picture" transform="rotate(-4 100 100)">
        <path d="M50 52H150V148H50Z" style={grad("scene")} />
        <circle cx="122" cy="76" r="11" style={fill("moon")} />
        <path d="M50 124L76 92L94 112L110 98L150 130V148H50Z" style={fill("stone")} />
        <path d="M50 136C70 128 90 142 110 134C126 128 138 136 150 134V148H50Z" style={fill("foliage")} />
        <g data-part="picture-detail">
          <path d="M76 92L70 102L76 100L82 104Z" style={fill("moon", 0.6)} />
          <path d="M56 70l3 0M70 62l3 0M92 66l3 0" strokeWidth="1.2" strokeLinecap="round" style={stroke("moon", 0.8)} />
          <path d="M60 58H146V142" strokeWidth="0.7" style={stroke("moon", 0.25)} />
        </g>
      </g>
      <g data-part="tear" transform="rotate(-4 100 100)">
        <path d="M118 148L132 138L136 146L146 140L150 148L162 160H118Z" style={fill("sky")} />
        <path d="M118 148L132 138L136 146L146 140L150 148" strokeWidth="1.6" strokeLinejoin="round" style={stroke("parchment-text")} />
        <g data-part="tear-detail">
          <path d="M120 152L134 144L138 152L148 146" strokeWidth="0.8" style={stroke("parchment-border", 0.7)} />
        </g>
      </g>
    </g>
  );
}

const BODIES: Readonly<Record<BagPose, () => ReactElement>> = {
  closed: Closed,
  open: Open,
  paper: Paper,
  photo: Photo,
};

function resolvePose(pose: string | undefined): BagPose {
  return pose !== undefined && Object.prototype.hasOwnProperty.call(BODIES, pose) ? (pose as BagPose) : "closed";
}

/** The bag. An unknown pose falls back to `closed`. */
export function Bag({ pose, className }: BagProps): ReactElement {
  const name = resolvePose(pose);
  const Body = BODIES[name];
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
        <linearGradient id="th-bag-cloth" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={stop("parchment-border", 0.85)} />
          <stop offset="0.5" style={stop("parchment")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <linearGradient id="th-bag-leather" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("parchment-border")} />
          <stop offset="1" style={stop("parchment")} />
        </linearGradient>
        <linearGradient id="th-bag-paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("parchment-text")} />
          <stop offset="1" style={stop("parchment-border")} />
        </linearGradient>
        <linearGradient id="th-bag-scene" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("sky")} />
          <stop offset="1" style={stop("fog")} />
        </linearGradient>
      </defs>
      <Shadow />
      <Body />
    </svg>
  );
}

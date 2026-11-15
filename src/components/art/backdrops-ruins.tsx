import type { CSSProperties, ReactElement } from "react";

/**
 * Ruins backdrop (hunter-ui design B3), the last Leg of the hunt journey.
 * Decorative only: no text, no title, no filter, no animate. Colors come only
 * from the `--th-*` tokens. Fine details sit in groups whose data-part ends
 * with `-detail` (hidden in high contrast by globals.css). Ambient groups carry
 * class names (th-parallax, th-fog-drift, th-sway, th-fly, th-flicker) that CSS
 * animates later.
 */

export interface RuinsBackdropProps {
  readonly className?: string;
}

const fill = (token: string, opacity?: number): CSSProperties =>
  opacity === undefined
    ? { fill: `var(--th-${token})` }
    : { fill: `var(--th-${token})`, fillOpacity: opacity };

const stroke = (token: string, opacity?: number): CSSProperties =>
  opacity === undefined
    ? { stroke: `var(--th-${token})` }
    : { stroke: `var(--th-${token})`, strokeOpacity: opacity };

const stop = (token: string, opacity?: number): CSSProperties =>
  opacity === undefined
    ? { stopColor: `var(--th-${token})` }
    : { stopColor: `var(--th-${token})`, stopOpacity: opacity };

const RUINS_STARS: readonly (readonly [number, number])[] = [
  [50, 36], [140, 80], [230, 28], [330, 64], [610, 30], [690, 76], [750, 40], [90, 130], [720, 140],
];

/** [x, y, scale] crow silhouettes */
const CROWS: readonly (readonly [number, number, number])[] = [
  [470, 90, 1], [520, 120, 0.8], [440, 140, 0.7],
];

/** [x, y, length] hanging ivy strands */
const IVY: readonly (readonly [number, number, number])[] = [
  [168, 150, 120], [186, 140, 80], [214, 132, 100], [236, 132, 60],
  [352, 134, 90], [372, 128, 130], [392, 130, 70],
];

/** Crack lines on the floor */
const CRACKS = "M120 470L170 456L196 468L250 452M420 480L470 462L500 474L560 458L610 470M300 490L330 474L318 462M660 488L700 472";

export function BackdropRuins({ className }: RuinsBackdropProps): ReactElement {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 800 500"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMax slice"
      className={className}
    >
      <defs>
        <linearGradient id="th-rn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("sky")} />
          <stop offset="0.55" style={stop("sky")} />
          <stop offset="1" style={stop("fog")} />
        </linearGradient>
        <radialGradient id="th-rn-moon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("moon", 0.35)} />
          <stop offset="1" style={stop("moon", 0)} />
        </radialGradient>
        <linearGradient id="th-rn-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("stone", 0.8)} />
          <stop offset="1" style={stop("fog")} />
        </linearGradient>
        <linearGradient id="th-rn-stone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("stone")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <radialGradient id="th-rn-glow" cx="0.5" cy="0.6" r="0.55">
          <stop offset="0" style={stop("lantern", 0.7)} />
          <stop offset="0.5" style={stop("lantern", 0.25)} />
          <stop offset="1" style={stop("lantern", 0)} />
        </radialGradient>
        <linearGradient id="th-rn-fog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("fog", 0)} />
          <stop offset="0.5" style={stop("fog", 0.75)} />
          <stop offset="1" style={stop("fog", 0)} />
        </linearGradient>
      </defs>

      <g data-part="sky">
        <rect x="0" y="0" width="800" height="500" fill="url(#th-rn-sky)" />
        <circle cx="640" cy="120" r="120" fill="url(#th-rn-moon)" />
        <circle cx="640" cy="120" r="36" style={fill("moon", 0.92)} />
        <circle cx="630" cy="112" r="6" style={fill("stone", 0.25)} />
        <circle cx="652" cy="130" r="4" style={fill("stone", 0.22)} />
        <g data-part="stars-detail">
          {RUINS_STARS.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" style={fill("moon", 0.65)} />
          ))}
        </g>
      </g>

      <g data-part="layer-far" className="th-parallax" style={{ opacity: 0.55 }}>
        <path
          d="M0 340V290L40 270L70 296L130 250L190 300L260 266L320 310L520 300L580 262L650 304L720 270L800 300V380H0z"
          fill="url(#th-rn-far)"
        />
        <path d="M580 262V230h14v20M620 280V246h12v30" style={fill("stone", 0.7)} />
        <g data-part="layer-far-detail">
          <path d="M130 250L120 290M260 266L250 300M580 262L572 296" fill="none" strokeWidth="1.2" strokeLinecap="round" style={stroke("moon", 0.3)} />
        </g>
      </g>

      <g data-part="fog-back" className="th-fog-drift">
        <ellipse cx="220" cy="372" rx="260" ry="20" fill="url(#th-rn-fog)" />
        <ellipse cx="640" cy="360" rx="280" ry="18" fill="url(#th-rn-fog)" />
      </g>

      <g data-part="layer-mid" className="th-parallax">
        <g data-part="glow" className="th-flicker">
          <ellipse cx="400" cy="340" rx="150" ry="120" fill="url(#th-rn-glow)" />
          <path d="M360 440L400 280L440 440z" style={fill("lantern", 0.25)} />
          <g data-part="glow-detail">
            <circle cx="384" cy="360" r="2" style={fill("lantern", 0.7)} />
            <circle cx="416" cy="330" r="1.6" style={fill("lantern", 0.7)} />
            <circle cx="402" cy="392" r="1.4" style={fill("lantern", 0.6)} />
          </g>
        </g>

        <g data-part="gate">
          <path d="M240 450V236L262 220L290 236V450z" fill="url(#th-rn-stone)" />
          <path d="M510 450V250L530 226L548 240L560 214V450z" fill="url(#th-rn-stone)" />
          <path d="M290 236C300 200 340 180 372 190L388 214L360 226L334 244L318 450H290z" style={fill("stone", 0.9)} />
          <path d="M240 236L262 220L290 236" fill="none" strokeWidth="2" strokeLinecap="round" style={stroke("moon", 0.4)} />
          <path d="M510 250L530 226L548 240L560 214" fill="none" strokeWidth="2" strokeLinecap="round" style={stroke("moon", 0.4)} />
          <g data-part="gate-detail">
            <path d="M240 290H290M240 340H290M240 390H290M510 300H560M510 350H560M510 400H560" fill="none" strokeWidth="1.2" style={stroke("ground", 0.7)} />
            <path d="M264 240V290M270 340V390M534 250V300M524 350V400" fill="none" strokeWidth="1.2" style={stroke("ground", 0.7)} />
            <path d="M262 244L276 270L268 290" fill="none" strokeWidth="1.4" strokeLinecap="round" style={stroke("ground")} />
          </g>
        </g>

        <g data-part="arches">
          <path d="M70 450V320a46 46 0 0 1 92 0V450H140V330a24 24 0 0 0-48 0V450z" fill="url(#th-rn-stone)" />
          <path d="M610 450V340a40 40 0 0 1 60 -34L690 330V450H664V350a14 14 0 0 0-28 0V450z" fill="url(#th-rn-stone)" />
          <path d="M70 320a46 46 0 0 1 92 0" fill="none" strokeWidth="2" strokeLinecap="round" style={stroke("moon", 0.4)} />
          <g data-part="arches-detail">
            <path d="M80 300l10 8M100 280l6 12M122 278l-4 12M146 292l-8 8" fill="none" strokeWidth="1.2" strokeLinecap="round" style={stroke("ground", 0.8)} />
            <path d="M620 380H650M620 410H650M672 380H686" fill="none" strokeWidth="1.2" style={stroke("ground", 0.7)} />
          </g>
        </g>
      </g>

      <g data-part="crows" className="th-fly">
        {CROWS.map(([x, y, s]) => (
          <path
            key={`${x}-${y}`}
            d="M0 0C6-8 12-8 16 0C20-8 26-8 32 0C26-3 20-1 16 4C12-1 6-3 0 0z"
            transform={`translate(${x} ${y}) scale(${s})`}
            style={fill("ground")}
          />
        ))}
        <g data-part="crows-detail">
          <path d="M300 218l8-4 4 4M318 212v-8" fill="none" strokeWidth="2" strokeLinecap="round" style={stroke("ground")} />
          <circle cx="310" cy="216" r="1.2" style={fill("lantern", 0.9)} />
        </g>
      </g>

      <g data-part="layer-near" className="th-parallax">
        <g data-part="columns">
          <path d="M44 500V380L52 360H92L100 380V500z" fill="url(#th-rn-stone)" />
          <path d="M40 360H104V348H40z" style={fill("stone")} />
          <path d="M690 500V420L700 404L716 412L726 396L744 404V500z" fill="url(#th-rn-stone)" />
          <path d="M300 468L420 458L426 484L304 494z" fill="url(#th-rn-stone)" />
          <path d="M420 458L440 462L446 480L426 484z" style={fill("stone")} />
          <path d="M300 468L420 458" fill="none" strokeWidth="2" strokeLinecap="round" style={stroke("moon", 0.4)} />
          <g data-part="columns-detail">
            <path d="M58 366V500M68 366V500M78 366V500M88 366V500" fill="none" strokeWidth="1" style={stroke("ground", 0.6)} />
            <path d="M320 468L322 490M350 464L352 488M380 462L382 486" fill="none" strokeWidth="1.2" style={stroke("ground", 0.6)} />
            <path d="M44 420L70 430L58 450" fill="none" strokeWidth="1.4" strokeLinecap="round" style={stroke("ground")} />
          </g>
        </g>

        <g data-part="ivy" className="th-sway">
          <g fill="none" strokeLinecap="round" style={stroke("foliage")}>
            {IVY.map(([x, y, len]) => (
              <path key={x} d={`M${x} ${y}Q${x + 8} ${y + len * 0.5} ${x - 2} ${y + len}`} strokeWidth="3" />
            ))}
          </g>
          <g data-part="ivy-detail">
            {IVY.map(([x, y, len]) => (
              <g key={x}>
                <ellipse cx={x + 4} cy={y + len * 0.35} rx="5" ry="3" style={fill("foliage")} />
                <ellipse cx={x - 2} cy={y + len * 0.7} rx="5" ry="3" style={fill("foliage")} />
                <ellipse cx={x} cy={y + len} rx="4" ry="2.5" style={fill("foliage", 0.8)} />
              </g>
            ))}
          </g>
        </g>
      </g>

      <g data-part="fog-front" className="th-fog-drift">
        <ellipse cx="400" cy="450" rx="460" ry="22" fill="url(#th-rn-fog)" />
      </g>

      <g data-part="floor">
        <path d="M0 450C200 440 600 442 800 450V500H0z" style={fill("ground")} />
        <path d="M0 450C200 440 600 442 800 450" fill="none" strokeWidth="2" strokeLinecap="round" style={stroke("stone", 0.8)} />
        <path d="M380 450L400 500L420 450z" style={fill("lantern", 0.18)} />
        <g data-part="floor-detail">
          <path d="M0 470H800M0 490H800" fill="none" strokeWidth="1" style={stroke("stone", 0.35)} />
          <path d={CRACKS} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={stroke("stone", 0.9)} />
        </g>
      </g>
    </svg>
  );
}

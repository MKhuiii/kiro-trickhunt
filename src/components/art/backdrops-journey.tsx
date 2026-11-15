import type { CSSProperties, ReactElement } from "react";

/**
 * Journey backdrops (hunter-ui design B3), continued from backdrops.tsx.
 * Decorative only: no text, no title, no filter, no animate. Colors come only
 * from the `--th-*` tokens. Fine details sit in groups whose data-part ends
 * with `-detail` (hidden in high contrast by globals.css). Ambient groups carry
 * class names (th-parallax, th-fog-drift) that CSS animates later.
 */

export interface JourneyBackdropProps {
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

/* ---------- Mountain (hunt journey, second Leg) ---------- */

const MTN_STARS: readonly (readonly [number, number, number])[] = [
  [40, 30, 1.3], [120, 60, 1], [210, 24, 1.4], [290, 80, 1], [360, 40, 1.2],
  [470, 70, 1], [530, 26, 1.4], [620, 90, 1], [690, 36, 1.3], [760, 80, 1],
  [80, 120, 1], [250, 130, 1.2], [580, 150, 1], [740, 160, 1],
];

const BRIDGE_STEPS = 12;
const BRIDGE_LEFT_X = 250;
const BRIDGE_RIGHT_X = 562;

/** Point on a quadratic curve whose control x is midway (x is linear in t). */
function bridgePoint(t: number, y0: number, yc: number, y1: number): readonly [number, number] {
  const x = BRIDGE_LEFT_X + (BRIDGE_RIGHT_X - BRIDGE_LEFT_X) * t;
  const y = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * yc + t * t * y1;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

const BRIDGE_TS: readonly number[] = Array.from({ length: BRIDGE_STEPS + 1 }, (_, i) => i / BRIDGE_STEPS);

export function BackdropMountain({ className }: JourneyBackdropProps): ReactElement {
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
        <linearGradient id="th-mtn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("sky")} />
          <stop offset="0.5" style={stop("sky")} />
          <stop offset="1" style={stop("fog")} />
        </linearGradient>
        <radialGradient id="th-mtn-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("moon", 0.35)} />
          <stop offset="1" style={stop("moon", 0)} />
        </radialGradient>
        <linearGradient id="th-mtn-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("stone", 0.8)} />
          <stop offset="1" style={stop("fog")} />
        </linearGradient>
        <linearGradient id="th-mtn-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("stone")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <linearGradient id="th-mtn-cliff" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("stone")} />
          <stop offset="0.6" style={stop("ground")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <linearGradient id="th-mtn-snow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("moon")} />
          <stop offset="1" style={stop("moon", 0.45)} />
        </linearGradient>
        <linearGradient id="th-mtn-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("fog", 0)} />
          <stop offset="0.5" style={stop("fog", 0.8)} />
          <stop offset="1" style={stop("fog", 0)} />
        </linearGradient>
        <radialGradient id="th-mtn-flame" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("lantern", 0.65)} />
          <stop offset="1" style={stop("lantern", 0)} />
        </radialGradient>
      </defs>

      <g data-part="sky">
        <rect x="0" y="0" width="800" height="500" fill="url(#th-mtn-sky)" />
        <circle cx="130" cy="110" r="120" fill="url(#th-mtn-glow)" />
        <circle cx="130" cy="110" r="34" style={fill("moon", 0.9)} />
        <circle cx="120" cy="104" r="7" style={fill("stone", 0.28)} />
        <circle cx="142" cy="122" r="5" style={fill("stone", 0.25)} />
        <g data-part="stars-detail">
          {MTN_STARS.map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} style={fill("moon", 0.7)} />
          ))}
        </g>
      </g>

      <g data-part="layer-far" className="th-parallax" style={{ opacity: 0.55 }}>
        <path
          d="M0 340L50 290L96 318L160 236L214 300L276 258L338 326L412 226L474 300L540 252L608 316L676 238L736 294L800 262V420H0z"
          fill="url(#th-mtn-far)"
        />
        <g data-part="layer-far-detail">
          <path
            d="M160 236L144 270M412 226L392 268M676 238L660 276M276 258L262 288"
            fill="none"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={stroke("moon", 0.4)}
          />
        </g>
      </g>

      <g data-part="clouds-back" className="th-fog-drift">
        <ellipse cx="180" cy="300" rx="190" ry="20" fill="url(#th-mtn-cloud)" />
        <ellipse cx="620" cy="276" rx="210" ry="18" fill="url(#th-mtn-cloud)" />
      </g>

      <g data-part="layer-mid" className="th-parallax">
        <path
          d="M0 420V336L84 292L146 332L226 256L300 336L378 286L440 150L500 276L560 226L644 316L724 262L800 330V440H0z"
          fill="url(#th-mtn-mid)"
        />
        <path d="M440 150L500 276L560 226L644 316L724 262L800 330V440H520z" style={fill("ground", 0.3)} />
        <g data-part="peak">
          <path d="M440 150L411 214L428 204L441 234L459 208L478 224z" fill="url(#th-mtn-snow)" />
          <path d="M440 150L378 288" fill="none" strokeWidth="2.5" strokeLinecap="round" style={stroke("moon", 0.7)} />
          <path d="M226 256L196 306L212 298L226 322L240 300z" style={fill("moon", 0.55)} />
          <path d="M560 226L538 262L552 256L562 274L574 254z" style={fill("moon", 0.5)} />
          <g data-part="peak-detail">
            <path
              d="M432 180L424 220M448 176L452 214M418 250L408 280M470 250L482 276M214 280L206 304M556 252L548 270"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={stroke("stone", 0.7)}
            />
            <path d="M300 336L330 300L360 330M600 300L624 330" fill="none" strokeWidth="1.2" style={stroke("moon", 0.3)} />
          </g>
        </g>
      </g>

      <g data-part="clouds-mid" className="th-fog-drift">
        <ellipse cx="560" cy="344" rx="260" ry="22" fill="url(#th-mtn-cloud)" />
        <ellipse cx="140" cy="372" rx="220" ry="20" fill="url(#th-mtn-cloud)" />
      </g>

      <g data-part="layer-near" className="th-parallax">
        <g data-part="cliff-left">
          <path d="M0 500V340L60 328L130 346L200 338L250 360L240 402L262 442L250 500z" fill="url(#th-mtn-cliff)" />
          <path d="M0 340L60 328L130 346L200 338L250 360" fill="none" strokeWidth="2" strokeLinecap="round" style={stroke("moon", 0.4)} />
          <g data-part="cliff-left-detail">
            <path
              d="M60 360L74 400L64 440M150 372L160 420M214 372L224 410L216 450M20 400L34 440"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={stroke("stone", 0.7)}
            />
          </g>
        </g>
        <g data-part="cliff-right">
          <path d="M800 500V318L742 330L680 346L610 350L562 362L574 410L556 450L570 500z" fill="url(#th-mtn-cliff)" />
          <path d="M800 318L742 330L680 346L610 350L562 362" fill="none" strokeWidth="2" strokeLinecap="round" style={stroke("moon", 0.4)} />
          <g data-part="cliff-right-detail">
            <path
              d="M600 372L612 416L602 456M690 366L700 410M760 350L768 400L758 450"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={stroke("stone", 0.7)}
            />
          </g>
        </g>
        <g data-part="dead-tree">
          <g transform="translate(700 346) scale(1.25)" fill="none" strokeLinecap="round" strokeLinejoin="round" style={stroke("ground")}>
            <path d="M0 0C3-26 -3-52 1-84" strokeWidth="8" />
            <path d="M1-50C-14-62-26-64-38-84M-18-64C-22-76-20-88-28-98" strokeWidth="4" />
            <path d="M1-62C16-72 26-74 38-94" strokeWidth="4" />
            <path d="M1-84C-4-96-8-104-6-118M1-84C7-96 12-104 10-120" strokeWidth="3" />
            <path d="M-38-84l-9-5M38-94l9-3M-28-98l-7-7" strokeWidth="2" />
          </g>
          <path d="M696 290C698 300 697 318 698 338" fill="none" strokeWidth="1.5" strokeLinecap="round" style={stroke("moon", 0.4)} />
        </g>
      </g>

      <g data-part="rope-bridge">
        <g data-part="bridge-posts">
          <path d="M246 362V326M254 362V326M566 364V328M558 364V328" fill="none" strokeWidth="5" strokeLinecap="round" style={stroke("ground")} />
        </g>
        <path
          d={`M${BRIDGE_LEFT_X} 362Q406 420 ${BRIDGE_RIGHT_X} 364`}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          style={stroke("ground")}
        />
        <path
          d={`M${BRIDGE_LEFT_X} 336Q406 396 ${BRIDGE_RIGHT_X} 338`}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          style={stroke("ground")}
        />
        <g data-part="bridge-planks">
          {BRIDGE_TS.slice(0, -1).map((t) => {
            const [x, y] = bridgePoint(t, 362, 420, 364);
            return <path key={t} d={`M${x - 3} ${y - 2}h18l1 7h-18z`} style={fill("ground")} />;
          })}
        </g>
        <g data-part="bridge-detail">
          {BRIDGE_TS.slice(1, -1).map((t) => {
            const [x, y] = bridgePoint(t, 362, 420, 364);
            const [, top] = bridgePoint(t, 336, 396, 338);
            return <path key={t} d={`M${x} ${y}V${top}`} fill="none" strokeWidth="1.3" style={stroke("stone", 0.8)} />;
          })}
          <path
            d={`M${BRIDGE_LEFT_X} 359Q406 417 ${BRIDGE_RIGHT_X} 361`}
            fill="none"
            strokeWidth="1"
            style={stroke("moon", 0.4)}
          />
        </g>
        <g data-part="bridge-lantern">
          <circle cx="254" cy="330" r="34" fill="url(#th-mtn-flame)" />
          <path d="M254 326v-8" fill="none" strokeWidth="2" strokeLinecap="round" style={stroke("ground")} />
          <path d="M248 326h12l-2 10h-8z" style={fill("lantern")} />
        </g>
      </g>

      <g data-part="clouds-front" className="th-fog-drift">
        <ellipse cx="400" cy="440" rx="480" ry="26" fill="url(#th-mtn-cloud)" />
        <ellipse cx="660" cy="478" rx="360" ry="20" fill="url(#th-mtn-cloud)" />
      </g>

      <g data-part="ground">
        <path d="M0 484C200 474 600 478 800 484V500H0z" style={fill("ground")} />
      </g>
    </svg>
  );
}

/* ---------- Swamp (hunt journey, third Leg) ---------- */

/** [x, baseY, height, lean, cattail] */
const REEDS: readonly (readonly [number, number, number, number, boolean])[] = [
  [40, 500, 190, 14, true], [62, 500, 140, -10, false], [84, 500, 170, 8, true], [112, 500, 110, -6, false],
  [690, 500, 180, -12, true], [716, 500, 130, 10, false], [742, 500, 200, -16, true], [770, 500, 150, 8, false],
  [380, 470, 90, 8, true], [404, 470, 70, -6, false], [150, 440, 80, 6, false], [620, 446, 84, -8, true],
];

/** [cx, cy, rx] */
const LILY_PADS: readonly (readonly [number, number, number])[] = [
  [230, 450, 34], [310, 478, 26], [520, 440, 30], [470, 480, 38], [600, 484, 24], [180, 486, 22],
];

/** [x, y, length] hanging moss strands */
const MOSS: readonly (readonly [number, number, number])[] = [
  [24, 0, 90], [48, 0, 130], [72, 0, 70], [96, 0, 110], [120, 0, 60],
  [680, 0, 70], [704, 0, 120], [728, 0, 90], [752, 0, 140], [776, 0, 80],
];

/** [cx, cy, rx] moon reflection streaks */
const MOON_STREAKS: readonly (readonly [number, number, number])[] = [
  [560, 322, 30], [566, 336, 26], [556, 352, 34], [564, 370, 22], [558, 390, 28],
];

const SWAMP_STARS: readonly (readonly [number, number])[] = [
  [60, 40], [150, 90], [240, 30], [330, 70], [420, 36], [500, 100], [660, 50], [740, 110], [90, 150], [700, 170],
];

function reedPath(x: number, y: number, h: number, lean: number): string {
  return `M${x} ${y}Q${x + lean * 0.3} ${y - h * 0.55} ${x + lean} ${y - h}`;
}

export function BackdropSwamp({ className }: JourneyBackdropProps): ReactElement {
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
        <linearGradient id="th-swp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("sky")} />
          <stop offset="0.45" style={stop("sky")} />
          <stop offset="0.62" style={stop("fog")} />
          <stop offset="1" style={stop("fog")} />
        </linearGradient>
        <radialGradient id="th-swp-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("moon", 0.4)} />
          <stop offset="1" style={stop("moon", 0)} />
        </radialGradient>
        <linearGradient id="th-swp-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("foliage", 0.9)} />
          <stop offset="1" style={stop("fog")} />
        </linearGradient>
        <linearGradient id="th-swp-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("fog")} />
          <stop offset="0.25" style={stop("water")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <linearGradient id="th-swp-fog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("fog", 0)} />
          <stop offset="0.5" style={stop("fog", 0.75)} />
          <stop offset="1" style={stop("fog", 0)} />
        </linearGradient>
        <linearGradient id="th-swp-stump" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={stop("ground")} />
          <stop offset="0.7" style={stop("foliage")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <radialGradient id="th-swp-wisp" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("lantern", 0.8)} />
          <stop offset="0.35" style={stop("lantern", 0.3)} />
          <stop offset="1" style={stop("lantern", 0)} />
        </radialGradient>
      </defs>

      <g data-part="sky">
        <rect x="0" y="0" width="800" height="500" fill="url(#th-swp-sky)" />
        <circle cx="560" cy="170" r="130" fill="url(#th-swp-glow)" />
        <circle cx="560" cy="170" r="38" style={fill("moon", 0.92)} />
        <circle cx="549" cy="162" r="7" style={fill("fog", 0.3)} />
        <circle cx="574" cy="182" r="5" style={fill("fog", 0.28)} />
        <g data-part="stars-detail">
          {SWAMP_STARS.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" style={fill("moon", 0.65)} />
          ))}
        </g>
      </g>

      <g data-part="layer-far" className="th-parallax" style={{ opacity: 0.6 }}>
        <path
          d="M0 300V236L24 214L40 240L70 196L96 246L130 222L160 262L200 230L240 266L290 240L330 272L380 244L430 270L490 238L540 268L600 232L650 262L700 218L740 252L770 226L800 246V300z"
          fill="url(#th-swp-far)"
        />
        <g data-part="layer-far-detail">
          <path
            d="M70 196L62 230M200 230L194 262M380 244L372 270M600 232L592 262M700 218L694 248"
            fill="none"
            strokeWidth="1.2"
            strokeLinecap="round"
            style={stroke("moon", 0.3)}
          />
        </g>
      </g>

      <g data-part="fog-back" className="th-fog-drift">
        <ellipse cx="200" cy="296" rx="260" ry="20" fill="url(#th-swp-fog)" />
        <ellipse cx="640" cy="290" rx="280" ry="18" fill="url(#th-swp-fog)" />
      </g>

      <g data-part="water">
        <rect x="0" y="300" width="800" height="200" fill="url(#th-swp-water)" />
        <g data-part="reflections">
          {MOON_STREAKS.map(([x, y, rx]) => (
            <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={rx} ry="2.4" style={fill("moon", 0.5)} />
          ))}
          <path d="M60 318V338M110 320V346M180 318V342M300 322V350M380 318V340" fill="none" strokeWidth="6" strokeLinecap="round" style={stroke("foliage", 0.5)} />
        </g>
        <g data-part="water-detail">
          <path
            d="M30 360q30-5 60 0M180 392q40-6 80 0M330 350q30-4 60 0M460 420q40-6 80 0M640 380q34-5 68 0M90 440q40-6 80 0M690 450q30-4 60 0"
            fill="none"
            strokeWidth="1.3"
            strokeLinecap="round"
            style={stroke("moon", 0.3)}
          />
        </g>
      </g>

      <g data-part="layer-mid" className="th-parallax">
        <g data-part="stumps">
          <path d="M296 360L300 318L306 326L312 312L318 324L326 316L330 360C320 366 306 366 296 360z" fill="url(#th-swp-stump)" />
          <path d="M296 360C306 372 320 372 330 360" fill="none" strokeWidth="2" style={stroke("moon", 0.25)} />
          <path d="M470 372L472 322L479 332L486 316L494 330L500 322L504 372C494 378 480 378 470 372z" fill="url(#th-swp-stump)" />
          <path d="M120 352L124 330L132 340L140 326L148 338L152 352C142 358 130 358 120 352z" fill="url(#th-swp-stump)" />
          <g data-part="stumps-detail">
            <path d="M306 330V356M318 332V358M480 338V368M492 338V366M130 342V350" fill="none" strokeWidth="1.2" strokeLinecap="round" style={stroke("foliage", 0.9)} />
            <path d="M300 318L292 302M312 312L316 296M486 316L480 298M494 330L506 318" fill="none" strokeWidth="2" strokeLinecap="round" style={stroke("ground")} />
          </g>
          <path d="M296 362q-14 6-26 4M330 362q14 6 26 2M470 374q-14 6-26 4M504 374q14 6 26 2" fill="none" strokeWidth="1.5" style={stroke("moon", 0.25)} />
        </g>
      </g>

      <g data-part="wisps" className="th-fly">
        <g data-part="wisp-a">
          <circle cx="250" cy="320" r="26" fill="url(#th-swp-wisp)" />
          <circle cx="250" cy="320" r="4" style={fill("lantern")} />
        </g>
        <g data-part="wisp-b">
          <circle cx="420" cy="290" r="22" fill="url(#th-swp-wisp)" />
          <circle cx="420" cy="290" r="3.5" style={fill("lantern")} />
        </g>
        <g data-part="wisp-c">
          <circle cx="640" cy="340" r="24" fill="url(#th-swp-wisp)" />
          <circle cx="640" cy="340" r="4" style={fill("lantern")} />
        </g>
        <g data-part="wisps-detail">
          <circle cx="250" cy="352" r="3" style={fill("lantern", 0.35)} />
          <circle cx="420" cy="318" r="2.5" style={fill("lantern", 0.3)} />
          <circle cx="640" cy="372" r="3" style={fill("lantern", 0.35)} />
        </g>
      </g>

      <g data-part="layer-near" className="th-parallax">
        <g data-part="lily-pads">
          {LILY_PADS.map(([x, y, rx]) => (
            <g key={`${x}-${y}`}>
              <ellipse cx={x} cy={y} rx={rx} ry={rx * 0.28} style={fill("foliage")} />
              <path d={`M${x} ${y}L${x + rx * 0.5} ${y - rx * 0.1}`} fill="none" strokeWidth="2" style={stroke("water")} />
              <ellipse cx={x - rx * 0.2} cy={y - rx * 0.06} rx={rx * 0.5} ry={rx * 0.08} style={fill("moon", 0.18)} />
            </g>
          ))}
          <g data-part="lily-pads-detail">
            <circle cx="230" cy="444" r="3.5" style={fill("moon", 0.8)} />
            <circle cx="520" cy="434" r="3.5" style={fill("moon", 0.8)} />
            <path d="M200 458q30 6 60 0M440 490q40 6 80 0" fill="none" strokeWidth="1.2" style={stroke("moon", 0.25)} />
          </g>
        </g>

        <g data-part="bank-left">
          <path d="M0 500V430C40 420 90 440 130 460C150 470 160 486 170 500z" style={fill("ground")} />
          <path d="M0 430C40 420 90 440 130 460" fill="none" strokeWidth="2" strokeLinecap="round" style={stroke("foliage")} />
        </g>
        <g data-part="bank-right">
          <path d="M800 500V420C760 414 710 436 670 458C650 470 640 486 630 500z" style={fill("ground")} />
          <path d="M800 420C760 414 710 436 670 458" fill="none" strokeWidth="2" strokeLinecap="round" style={stroke("foliage")} />
        </g>

        <g data-part="reeds" className="th-sway">
          {REEDS.map(([x, y, h, lean, cat]) => (
            <g key={`${x}-${y}`}>
              <path d={reedPath(x, y, h, lean)} fill="none" strokeWidth="3" strokeLinecap="round" style={stroke("foliage")} />
              {cat ? <ellipse cx={x + lean} cy={y - h + 10} rx="4" ry="12" style={fill("ground")} /> : null}
            </g>
          ))}
          <g data-part="reeds-detail">
            {REEDS.map(([x, y, h, lean]) => (
              <path
                key={`${x}-${y}`}
                d={`M${x + 5} ${y}Q${x + 5 + lean * 0.3} ${y - h * 0.45} ${x + lean * 0.7 + 8} ${y - h * 0.8}`}
                fill="none"
                strokeWidth="1.2"
                strokeLinecap="round"
                style={stroke("moon", 0.25)}
              />
            ))}
          </g>
        </g>

        <g data-part="moss">
          <path d="M0 0H140C120 18 70 24 0 20z" style={fill("ground")} />
          <path d="M800 0H660C690 20 740 26 800 22z" style={fill("ground")} />
          <g fill="none" strokeLinecap="round" style={stroke("foliage")}>
            {MOSS.map(([x, y, len]) => (
              <path key={x} d={`M${x} ${y + 14}Q${x + 8} ${y + len * 0.5} ${x - 2} ${y + len}`} strokeWidth="4" />
            ))}
          </g>
          <g data-part="moss-detail" fill="none" strokeLinecap="round" style={stroke("moon", 0.2)}>
            {MOSS.map(([x, y, len]) => (
              <path key={x} d={`M${x + 3} ${y + 20}Q${x + 10} ${y + len * 0.5} ${x + 1} ${y + len * 0.8}`} strokeWidth="1" />
            ))}
          </g>
        </g>
      </g>

      <g data-part="fog-front" className="th-fog-drift">
        <ellipse cx="400" cy="420" rx="460" ry="24" fill="url(#th-swp-fog)" />
        <ellipse cx="180" cy="474" rx="340" ry="18" fill="url(#th-swp-fog)" />
      </g>

      <g data-part="ground">
        <path d="M0 492C200 484 600 486 800 492V500H0z" style={fill("ground")} />
      </g>
    </svg>
  );
}

import type { CSSProperties, ReactElement } from "react";

/**
 * Detailed backdrops (hunter-ui design B3). Decorative only: no text, no title,
 * no filter, no animate. Colors come only from the `--th-*` tokens; depth comes
 * from gradients and opacity. Fine details sit in groups whose data-part ends
 * with `-detail` (hidden in high contrast by globals.css). Ambient groups carry
 * class names (th-fog-drift, th-sway, th-flicker, th-fly) that CSS animates later.
 */

export interface BackdropProps {
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

const MOON_X = 600;
const MOON_Y = 120;

const STARS: readonly (readonly [number, number, number])[] = [
  [60, 40, 1.4], [140, 90, 1], [220, 30, 1.2], [300, 70, 1], [370, 28, 1.5],
  [430, 100, 1], [480, 45, 1.2], [60, 150, 1], [180, 160, 1.3], [330, 140, 1],
  [720, 50, 1.3], [770, 130, 1], [700, 190, 1], [510, 170, 1], [260, 110, 1],
];

const GRAVES: readonly (readonly [number, number, number, number])[] = [
  // x, base y, width, height
  [96, 392, 46, 62], [214, 400, 40, 50], [330, 396, 52, 70], [520, 398, 44, 56], [660, 392, 50, 66],
];

const FENCE_XS: readonly number[] = Array.from({ length: 21 }, (_, i) => 10 + i * 38);

/** Dead tree: trunk plus bare branches, drawn with strokes (stroke set by <use>). */
function TreeShape(): ReactElement {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M0 0C2-30 -2-60 1-95" strokeWidth="9" />
      <path d="M1-60C-14-72-26-76-40-96M-18-74C-24-88-22-100-30-112" strokeWidth="4" />
      <path d="M1-72C16-84 28-86 42-108M22-88C30-98 28-110 38-122" strokeWidth="4" />
      <path d="M1-95C-4-108-10-118-8-134M1-95C8-110 14-120 12-136" strokeWidth="3" />
      <path d="M-40-96l-10-6M42-108l10-4M-30-112l-8-8M38-122l8-6" strokeWidth="2" />
    </g>
  );
}

export function BackdropHome({ className }: BackdropProps): ReactElement {
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
        <linearGradient id="th-home-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("sky")} />
          <stop offset="0.6" style={stop("sky")} />
          <stop offset="1" style={stop("fog")} />
        </linearGradient>
        <radialGradient id="th-home-moon" cx="0.38" cy="0.35" r="0.75">
          <stop offset="0" style={stop("moon")} />
          <stop offset="0.7" style={stop("moon")} />
          <stop offset="1" style={stop("fog")} />
        </radialGradient>
        <radialGradient id="th-home-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("moon", 0.35)} />
          <stop offset="1" style={stop("moon", 0)} />
        </radialGradient>
        <linearGradient id="th-home-hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("stone", 0.55)} />
          <stop offset="0.25" style={stop("ground")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <linearGradient id="th-home-stone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("stone")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <linearGradient id="th-home-fog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("fog", 0)} />
          <stop offset="0.5" style={stop("fog", 0.75)} />
          <stop offset="1" style={stop("fog", 0)} />
        </linearGradient>
        <radialGradient id="th-home-flame" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("lantern", 0.6)} />
          <stop offset="1" style={stop("lantern", 0)} />
        </radialGradient>
        <radialGradient id="th-home-pumpkin" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" style={stop("lantern")} />
          <stop offset="1" style={stop("lantern", 0.7)} />
        </radialGradient>
        <g id="th-home-tree">
          <TreeShape />
        </g>
        <g id="th-home-bat">
          <path d="M0 0C-4-6-12-8-20-4C-16-3-14 0-12 3C-9 1-6 2-4 5C-3 3-1 2 0 3C1 2 3 3 4 5C6 2 9 1 12 3C14 0 16-3 20-4C12-8 4-6 0 0z" />
          <path d="M-2 0l-2-5 3 2h2l3-2-2 5z" />
        </g>
      </defs>

      <g data-part="sky">
        <rect x="0" y="0" width="800" height="500" fill="url(#th-home-sky)" />
        <g data-part="stars-detail">
          {STARS.map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} style={fill("moon", 0.7)} />
          ))}
        </g>
      </g>

      <g data-part="moon">
        <circle cx={MOON_X} cy={MOON_Y} r="150" fill="url(#th-home-glow)" />
        <circle cx={MOON_X} cy={MOON_Y} r="118" style={{ ...fill("moon", 0.05), ...stroke("moon", 0.18) }} strokeWidth="1.5" />
        <circle cx={MOON_X} cy={MOON_Y} r="92" style={{ ...fill("moon", 0.07), ...stroke("moon", 0.25) }} strokeWidth="1.5" />
        <circle cx={MOON_X} cy={MOON_Y} r="68" fill="url(#th-home-moon)" />
        <path
          d={`M${MOON_X - 60} ${MOON_Y - 30}A68 68 0 0 1 ${MOON_X + 20} ${MOON_Y - 64}`}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          style={stroke("moon")}
        />
        <g data-part="moon-craters-detail">
          <circle cx={MOON_X - 18} cy={MOON_Y - 8} r="12" style={fill("stone", 0.28)} />
          <circle cx={MOON_X + 22} cy={MOON_Y + 20} r="9" style={fill("stone", 0.3)} />
          <circle cx={MOON_X + 30} cy={MOON_Y - 22} r="6" style={fill("stone", 0.25)} />
          <circle cx={MOON_X - 28} cy={MOON_Y + 28} r="5" style={fill("stone", 0.25)} />
        </g>
      </g>

      <g data-part="trees-far" style={{ opacity: 0.4 }}>
        <use href="#th-home-tree" transform="translate(70 345) scale(0.9)" style={stroke("stone")} />
        <use href="#th-home-tree" transform="translate(250 350) scale(0.7)" style={stroke("stone")} />
        <use href="#th-home-tree" transform="translate(470 347) scale(0.8)" style={stroke("stone")} />
        <use href="#th-home-tree" transform="translate(740 350) scale(0.75)" style={stroke("stone")} />
      </g>

      <g data-part="fog-back" className="th-fog-drift">
        <ellipse cx="400" cy="340" rx="520" ry="34" fill="url(#th-home-fog)" />
      </g>

      <g data-part="trees-mid" className="th-sway" style={{ opacity: 0.75 }}>
        <use href="#th-home-tree" transform="translate(30 372) scale(1.4)" style={stroke("ground")} />
        <use href="#th-home-tree" transform="translate(410 366) scale(1.2)" style={stroke("ground")} />
        <use href="#th-home-tree" transform="translate(770 372) scale(1.5)" style={stroke("ground")} />
      </g>

      <g data-part="hill">
        <path d="M0 360C120 340 260 350 400 362S690 342 800 356V500H0z" fill="url(#th-home-hill)" />
        <path d="M0 360C120 340 260 350 400 362S690 342 800 356" fill="none" strokeWidth="2" style={stroke("moon", 0.35)} />
      </g>

      <g data-part="graves">
        {GRAVES.map(([x, y, w, h]) => (
          <g key={x}>
            <path
              d={`M${x} ${y}V${y - h + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y - h + w / 2}V${y}z`}
              fill="url(#th-home-stone)"
            />
            <path
              d={`M${x + 1} ${y - 4}V${y - h + w / 2}A${w / 2 - 1} ${w / 2 - 1} 0 0 1 ${x + w / 2} ${y - h}`}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              style={stroke("moon", 0.5)}
            />
            <g data-part="grave-detail">
              <path
                d={`M${x + w * 0.3} ${y - h * 0.55}h${w * 0.4}M${x + w * 0.5} ${y - h * 0.7}v${h * 0.3}`}
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={stroke("ground", 0.6)}
              />
              <path d={`M${x - 6} ${y}h${w + 12}`} strokeWidth="4" strokeLinecap="round" style={stroke("ground")} />
            </g>
          </g>
        ))}
        <g data-part="crosses">
          <g style={fill("stone")}>
            <path d="M176 400V340h6V400zM166 354h26v6H166z" />
            <path d="M440 404V348h6V404zM430 362h26v6H430z" transform="rotate(-8 443 404)" />
            <path d="M600 400V344h6V400zM590 358h26v6H590z" />
          </g>
          <path d="M179 340V400M440 348V404" fill="none" strokeWidth="1.5" style={stroke("moon", 0.45)} />
        </g>
      </g>

      <g data-part="fence">
        <path d="M0 404H800M0 428H800" fill="none" strokeWidth="4" style={stroke("ground")} />
        {FENCE_XS.map((x) => (
          <path key={x} d={`M${x} 438V398l4-12 4 12V438z`} style={fill("ground")} />
        ))}
        <g data-part="fence-detail">
          {FENCE_XS.map((x) => (
            <path key={x} d={`M${x + 4} 392V434`} fill="none" strokeWidth="1" style={stroke("moon", 0.35)} />
          ))}
          <path d="M0 402H800" fill="none" strokeWidth="1" style={stroke("moon", 0.3)} />
        </g>
      </g>

      <g data-part="trees-near" className="th-sway">
        <use href="#th-home-tree" transform="translate(-10 470) scale(2.3)" style={stroke("ground")} />
        <use href="#th-home-tree" transform="translate(805 470) scale(2.1) scale(-1 1)" style={stroke("ground")} />
      </g>

      <g data-part="lantern" className="th-flicker">
        <circle cx="400" cy="452" r="70" fill="url(#th-home-flame)" />
        <ellipse cx="400" cy="456" rx="30" ry="25" fill="url(#th-home-pumpkin)" />
        <path d="M400 431c-4-6-3-10 1-14" fill="none" strokeWidth="4" strokeLinecap="round" style={stroke("ground")} />
        <g data-part="lantern-detail">
          <path d="M388 432C380 442 380 470 388 480M412 432C420 442 420 470 412 480M400 431V481" fill="none" strokeWidth="1.5" style={stroke("ground", 0.45)} />
          <path d="M386 452l6 8 4-8zM404 452l4 8 6-8zM390 468q10 7 20 0" style={fill("ground")} strokeLinejoin="round" />
        </g>
        <path d="M384 440C390 436 396 435 400 435" fill="none" strokeWidth="2" strokeLinecap="round" style={stroke("moon", 0.6)} />
      </g>

      <g data-part="fog-front" className="th-fog-drift">
        <ellipse cx="300" cy="420" rx="560" ry="30" fill="url(#th-home-fog)" />
        <ellipse cx="600" cy="462" rx="520" ry="26" fill="url(#th-home-fog)" />
      </g>

      <g data-part="ground">
        <path d="M0 470C200 460 600 464 800 470V500H0z" style={fill("ground")} />
        <g data-part="grass-detail">
          <path d="M40 472l-4-12 7 10 3-11 3 12 7-9-2 12zM700 474l-3-11 6 9 3-10 2 11 6-8-1 11z" style={fill("ground")} />
        </g>
      </g>

      <g data-part="bats" className="th-fly" style={fill("ground")}>
        <use href="#th-home-bat" transform="translate(470 70) scale(1.2)" />
        <use href="#th-home-bat" transform="translate(520 40) scale(0.8)" />
        <use href="#th-home-bat" transform="translate(690 190) scale(1)" />
      </g>

      <g transform="translate(116 -12)">
      <g data-part="crow" className="th-sway">
        <path d="M222 318C230 308 246 306 258 312L276 306 268 316C266 326 252 332 238 330L226 340 228 328C220 328 218 324 222 318z" style={fill("ground")} />
        <path d="M222 318L212 320 221 322z" style={fill("lantern")} />
        <g data-part="crow-detail">
          <circle cx="230" cy="314" r="1.6" style={fill("moon")} />
          <path d="M240 312C250 310 258 314 264 318" fill="none" strokeWidth="1.2" strokeLinecap="round" style={stroke("moon", 0.5)} />
          <path d="M238 330V338M246 328V336" fill="none" strokeWidth="2" strokeLinecap="round" style={stroke("ground")} />
        </g>
      </g>
      </g>
    </svg>
  );
}

/* ---------- Forest (hunt journey, first Leg) ---------- */

const PINES_FAR: readonly (readonly [number, number, number])[] = [
  // x, base y, scale
  [30, 330, 0.7], [110, 336, 0.9], [190, 328, 0.6], [270, 334, 0.8], [350, 330, 0.65],
  [440, 336, 0.85], [520, 330, 0.7], [600, 334, 0.9], [690, 328, 0.65], [770, 334, 0.8],
];

const PINES_MID: readonly (readonly [number, number, number])[] = [
  [60, 372, 1.2], [170, 380, 1.5], [270, 370, 1.1], [540, 372, 1.3], [650, 380, 1.6], [750, 370, 1.2],
];

const FIREFLIES: readonly (readonly [number, number, number])[] = [
  [150, 300, 3], [250, 360, 2.5], [330, 280, 2], [470, 330, 3], [560, 270, 2.5],
  [610, 350, 2], [700, 300, 3], [90, 380, 2], [420, 390, 2.5],
];

/** Pine: trunk plus four stacked tiers, drawn around x = 0 with base at y = 0. */
function PineShape(): ReactElement {
  return (
    <g>
      <path d="M-4 0V-30H4V0z" />
      <path d="M-34 -22L0 -84L34 -22z" />
      <path d="M-28 -58L0 -112L28 -58z" />
      <path d="M-22 -92L0 -138L22 -92z" />
      <path d="M-14 -122L0 -168L14 -122z" />
    </g>
  );
}

export function BackdropForest({ className }: BackdropProps): ReactElement {
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
        <linearGradient id="th-forest-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("sky")} />
          <stop offset="0.55" style={stop("sky")} />
          <stop offset="1" style={stop("fog")} />
        </linearGradient>
        <radialGradient id="th-forest-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("moon", 0.3)} />
          <stop offset="1" style={stop("moon", 0)} />
        </radialGradient>
        <linearGradient id="th-forest-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("foliage", 0.8)} />
          <stop offset="0.3" style={stop("ground")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <linearGradient id="th-forest-path" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("fog", 0.8)} />
          <stop offset="1" style={stop("stone", 0.7)} />
        </linearGradient>
        <linearGradient id="th-forest-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("fog", 0)} />
          <stop offset="0.5" style={stop("fog", 0.7)} />
          <stop offset="1" style={stop("fog", 0)} />
        </linearGradient>
        <linearGradient id="th-forest-trunk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={stop("ground")} />
          <stop offset="0.7" style={stop("foliage")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <radialGradient id="th-forest-fly" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("lantern", 0.9)} />
          <stop offset="1" style={stop("lantern", 0)} />
        </radialGradient>
        <g id="th-forest-pine">
          <PineShape />
        </g>
      </defs>

      <g data-part="sky">
        <rect x="0" y="0" width="800" height="500" fill="url(#th-forest-sky)" />
        <circle cx="560" cy="110" r="110" fill="url(#th-forest-glow)" />
        <circle cx="560" cy="110" r="38" style={fill("moon", 0.85)} />
        <g data-part="stars-detail">
          {STARS.slice(0, 9).map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} style={fill("moon", 0.6)} />
          ))}
        </g>
      </g>

      <g data-part="layer-far" className="th-parallax" style={{ opacity: 0.45 }}>
        {PINES_FAR.map(([x, y, s]) => (
          <use key={x} href="#th-forest-pine" transform={`translate(${x} ${y}) scale(${s})`} style={fill("foliage")} />
        ))}
        <g data-part="layer-far-detail">
          <path d="M0 336C200 326 600 328 800 336" fill="none" strokeWidth="1.5" style={stroke("moon", 0.3)} />
        </g>
      </g>

      <g data-part="mist-back" className="th-fog-drift">
        <ellipse cx="400" cy="340" rx="520" ry="30" fill="url(#th-forest-mist)" />
      </g>

      <g data-part="layer-mid" className="th-parallax" style={{ opacity: 0.8 }}>
        {PINES_MID.map(([x, y, s]) => (
          <use key={x} href="#th-forest-pine" transform={`translate(${x} ${y}) scale(${s})`} style={fill("ground")} />
        ))}
        <g data-part="twisted-mid">
          <path
            d="M380 392C372 350 392 320 376 276C370 258 384 244 372 224M376 276C360 266 350 270 342 252M382 300C400 292 408 280 404 262"
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={stroke("ground")}
          />
        </g>
        <g data-part="layer-mid-detail">
          {PINES_MID.map(([x, y, s]) => (
            <path key={x} d={`M${x - 20 * s} ${y - 66 * s}L${x} ${y - 112 * s}`} fill="none" strokeWidth="1.5" style={stroke("moon", 0.3)} />
          ))}
        </g>
      </g>

      <g data-part="ground">
        <path d="M0 392C160 380 340 388 800 380V500H0z" fill="url(#th-forest-ground)" />
        <g data-part="path">
          <path d="M340 500C360 460 380 430 392 392H430C440 430 480 470 560 500z" fill="url(#th-forest-path)" />
          <g data-part="path-detail">
            <path d="M372 480C384 450 396 420 404 398M470 484C452 460 436 436 426 402" fill="none" strokeWidth="1.5" style={stroke("moon", 0.3)} />
            <ellipse cx="410" cy="440" rx="6" ry="2.5" style={fill("ground", 0.6)} />
            <ellipse cx="440" cy="470" rx="8" ry="3" style={fill("ground", 0.6)} />
            <ellipse cx="380" cy="462" rx="5" ry="2" style={fill("ground", 0.6)} />
          </g>
        </g>
      </g>

      <g data-part="layer-near" className="th-parallax">
        <g data-part="trunk-left">
          <path d="M70 500C84 440 82 380 74 300C70 240 80 180 70 100L118 100C108 180 120 240 116 300C112 380 114 440 130 500z" fill="url(#th-forest-trunk)" />
          <g data-part="hollow">
            <ellipse cx="96" cy="330" rx="15" ry="26" style={fill("ground")} />
            <g data-part="owl-eyes">
              <circle cx="90" cy="326" r="4" style={fill("lantern")} />
              <circle cx="103" cy="326" r="4" style={fill("lantern")} />
              <circle cx="90" cy="326" r="1.6" style={fill("ground")} />
              <circle cx="103" cy="326" r="1.6" style={fill("ground")} />
            </g>
          </g>
          <g data-part="trunk-left-detail">
            <path d="M82 240C88 280 84 320 82 360M108 200C104 240 110 280 106 320" fill="none" strokeWidth="1.5" strokeLinecap="round" style={stroke("moon", 0.3)} />
            <path d="M84 160C94 170 100 176 98 190M90 200l12 6" fill="none" strokeWidth="1.2" style={stroke("stone", 0.6)} />
          </g>
          <path d="M70 100C40 90 20 70 4 30M118 100C150 94 168 70 190 40" fill="none" strokeWidth="9" strokeLinecap="round" style={stroke("ground")} />
        </g>
        <g data-part="trunk-right">
          <path d="M690 500C680 440 688 380 696 320C704 250 696 180 706 90L752 90C744 180 752 250 744 320C738 380 744 440 760 500z" fill="url(#th-forest-trunk)" />
          <path d="M752 100C780 90 796 70 800 40M706 100C680 94 664 76 650 50" fill="none" strokeWidth="9" strokeLinecap="round" style={stroke("ground")} />
          <g data-part="trunk-right-detail">
            <path d="M714 200C720 250 714 300 716 360M736 150C732 200 740 250 734 300" fill="none" strokeWidth="1.5" strokeLinecap="round" style={stroke("moon", 0.3)} />
          </g>
        </g>
        <g data-part="roots">
          <path
            d="M70 496C50 484 30 486 10 498M130 496C150 486 176 488 196 498M92 490C96 500 90 506 84 508M690 496C664 486 640 490 620 500M760 496C780 488 796 490 806 498"
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            style={stroke("ground")}
          />
          <g data-part="roots-detail">
            <path d="M60 486C46 480 34 481 22 488M144 488C158 484 172 485 184 490M676 488C660 484 646 486 634 492" fill="none" strokeWidth="1.2" strokeLinecap="round" style={stroke("moon", 0.3)} />
          </g>
        </g>
      </g>

      <g data-part="mist-front" className="th-fog-drift">
        <ellipse cx="300" cy="430" rx="560" ry="26" fill="url(#th-forest-mist)" />
        <ellipse cx="620" cy="476" rx="520" ry="22" fill="url(#th-forest-mist)" />
      </g>

      <g data-part="layer-front" className="th-parallax">
        <g data-part="ferns-detail">
          <path d="M0 500C10 470 24 458 40 452C34 466 36 480 44 500zM800 500C790 472 776 460 758 454C766 468 764 482 756 500z" style={fill("ground")} />
          <path d="M20 500C24 480 32 468 42 460M780 500C776 482 768 470 758 462" fill="none" strokeWidth="1.2" strokeLinecap="round" style={stroke("foliage")} />
        </g>
      </g>

      <g data-part="fireflies" className="th-fly">
        {FIREFLIES.map(([x, y, r]) => (
          <g key={`${x}-${y}`} data-part="firefly">
            <circle cx={x} cy={y} r={r * 4} fill="url(#th-forest-fly)" />
            <circle cx={x} cy={y} r={r * 0.6} style={fill("lantern")} />
          </g>
        ))}
      </g>
    </svg>
  );
}

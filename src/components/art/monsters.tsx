import type { CSSProperties, ReactElement } from "react";

/**
 * Monster art (hunter-ui design B3). Task 8.1: the Bank Ghost, a sheet ghost with
 * a wavy hem, hollow eyes, chains and a vault padlock on the chest. Decorative
 * only: no text, no title, no filter, no animate. Colors come only from tokens:
 * `--th-monster-bank` (base), `--th-ground` (dark), `--th-moon` (light),
 * `--th-stone` (chains, metal), `--th-lantern` (glowing eyes) and `--th-fog`.
 * Fine details sit in `-detail` groups (hidden in high contrast).
 */

export interface MonsterProps {
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

const grad = (id: string): CSSProperties => ({ fill: `url(#th-bghost-${id})` });

const r1 = (n: number): number => Math.round(n * 10) / 10;

/** Chain links laid along a line; links alternate between side-on and edge-on. */
function chainLinks(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  count: number,
): readonly { readonly x: number; readonly y: number; readonly angle: number; readonly flat: boolean }[] {
  const angle = r1((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI);
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 0.5) / count;
    return { x: r1(x1 + (x2 - x1) * t), y: r1(y1 + (y2 - y1) * t), angle, flat: i % 2 === 1 };
  });
}

const BODY =
  "M100 16C66 16 48 44 46 78C44 108 36 140 28 172Q40 188 52 176Q64 192 76 178Q88 194 100 180" +
  "Q112 194 124 178Q136 192 148 176Q160 188 172 172C164 140 156 108 154 78C152 44 134 16 100 16Z";
const SHADOW =
  "M128 22C146 38 154 58 154 78C156 108 164 140 172 172Q160 188 148 176Q136 192 124 178" +
  "Q138 120 128 22Z";
const RIM =
  "M100 16C66 16 48 44 46 78C44 108 36 140 28 172";
const FOLDS = "M70 100C66 130 62 150 58 172M130 104C134 130 140 150 142 174M100 150V180M84 96C80 120 78 140 76 164";
const ARM_L = "M48 98C32 112 32 138 42 152C52 142 56 120 58 102Z";
const ARM_R = "M152 98C168 112 168 138 158 152C148 142 144 120 142 102Z";
const CHAIN_A = chainLinks(54, 94, 146, 150, 9);
const CHAIN_B = chainLinks(146, 94, 54, 150, 9);

/** The Bank Ghost. `pose` is ignored; one pose only. */
export function MonsterBankGhost({ className }: MonsterProps): ReactElement {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <defs>
        <linearGradient id="th-bghost-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("moon", 0.55)} />
          <stop offset="0.35" style={stop("monster-bank")} />
          <stop offset="1" style={stop("monster-bank")} />
        </linearGradient>
        <radialGradient id="th-bghost-aura" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("monster-bank", 0.45)} />
          <stop offset="1" style={stop("monster-bank", 0)} />
        </radialGradient>
        <radialGradient id="th-bghost-eye" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("lantern", 0.9)} />
          <stop offset="1" style={stop("lantern", 0)} />
        </radialGradient>
        <linearGradient id="th-bghost-lock" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("moon", 0.6)} />
          <stop offset="0.4" style={stop("stone")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
      </defs>
      <g data-part="aura">
        <ellipse cx="100" cy="104" rx="96" ry="92" style={grad("aura")} />
      </g>
      <g data-part="body">
        <path d={BODY} style={grad("body")} />
        <path d={ARM_L} style={fill("ground", 0.18)} />
        <path d={ARM_R} style={fill("ground", 0.25)} />
        <path d={SHADOW} style={fill("ground", 0.32)} />
        <path d={RIM} strokeWidth="2.5" strokeLinecap="round" style={stroke("moon", 0.8)} />
        <g data-part="body-detail">
          <path d={FOLDS} strokeWidth="1.2" strokeLinecap="round" style={stroke("ground", 0.3)} />
          <path d="M40 176Q52 168 64 180M88 182Q100 172 112 182M136 180Q148 170 160 178" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.4)} />
        </g>
      </g>
      <g data-part="face">
        <ellipse cx="80" cy="62" rx="12" ry="16" style={fill("ground")} />
        <ellipse cx="120" cy="64" rx="12" ry="16" style={fill("ground")} />
        <circle cx="80" cy="68" r="10" style={grad("eye")} />
        <circle cx="120" cy="70" r="10" style={grad("eye")} />
        <circle cx="80" cy="68" r="3" style={fill("lantern")} />
        <circle cx="120" cy="70" r="3" style={fill("lantern")} />
        <ellipse cx="100" cy="94" rx="7" ry="11" style={fill("ground")} />
        <g data-part="face-detail">
          <path d="M66 42Q74 36 86 40M114 42Q126 36 134 44" strokeWidth="1.6" strokeLinecap="round" style={stroke("ground", 0.55)} />
          <path d="M80 82V92M120 84V94" strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.4)} />
        </g>
      </g>
      <g data-part="chains">
        {[CHAIN_A, CHAIN_B].map((links, c) => (
          <g key={c}>
            {links.map((l) => (
              <ellipse
                key={`${l.x}-${l.y}`}
                cx={l.x}
                cy={l.y}
                rx={l.flat ? 4 : 7}
                ry={l.flat ? 2.6 : 4}
                transform={`rotate(${l.angle} ${l.x} ${l.y})`}
                strokeWidth="2.6"
                style={stroke("stone")}
              />
            ))}
          </g>
        ))}
        <path d="M46 150Q40 164 44 176M154 150Q160 164 156 176" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 3" style={stroke("stone")} />
        <g data-part="chains-detail">
          {CHAIN_A.map((l) => (
            <circle key={`${l.x}-${l.y}`} cx={r1(l.x - 1.5)} cy={r1(l.y - 2)} r="0.9" style={fill("moon", 0.8)} />
          ))}
        </g>
      </g>
      <g data-part="padlock">
        <path d="M87 120V108a13 13 0 0 1 26 0V120" strokeWidth="5" strokeLinecap="round" style={stroke("stone")} />
        <rect x="82" y="116" width="36" height="32" rx="6" style={grad("lock")} />
        <rect x="82" y="116" width="36" height="32" rx="6" strokeWidth="1.5" style={stroke("ground", 0.7)} />
        <path d="M86 122H112" strokeWidth="1.5" strokeLinecap="round" style={stroke("moon", 0.7)} />
        <circle cx="100" cy="130" r="4.2" style={fill("ground")} />
        <rect x="98.4" y="130" width="3.2" height="9" rx="1" style={fill("ground")} />
        <g data-part="padlock-detail">
          <circle cx="100" cy="132" r="11" strokeWidth="1" strokeDasharray="2 2.5" style={stroke("moon", 0.45)} />
          <circle cx="88" cy="122" r="1.2" style={fill("moon", 0.7)} />
          <circle cx="112" cy="122" r="1.2" style={fill("moon", 0.7)} />
          <circle cx="88" cy="142" r="1.2" style={fill("ground", 0.7)} />
          <circle cx="112" cy="142" r="1.2" style={fill("ground", 0.7)} />
        </g>
      </g>
      <g data-part="mist-detail">
        <path d="M20 186Q60 176 100 188T180 184" strokeWidth="2" strokeLinecap="round" style={stroke("fog", 0.7)} />
      </g>
    </svg>
  );
}

/* ---------- Task 8.2: the Prize Vampire ----------
 * High-collar cape, fangs, slicked hair and a gift box with a ribbon in the hand.
 * Tokens: `--th-monster-prize` (base), `--th-ground` (dark), `--th-moon` (light, skin,
 * fangs, rim light), `--th-stone` (box) and `--th-lantern` (eyes, ribbon). */

const pgrad = (id: string): CSSProperties => ({ fill: `url(#th-pvamp-${id})` });

const P_CAPE =
  "M100 70C70 70 50 90 40 124C34 146 26 168 18 188Q60 196 100 190Q140 196 182 188" +
  "C174 168 166 146 160 124C150 90 130 70 100 70Z";
const P_CAPE_SHADOW = "M130 78C148 94 156 108 160 124C166 146 174 168 182 188Q160 194 140 190Q150 130 130 78Z";
const P_CAPE_RIM = "M100 70C70 70 50 90 40 124C34 146 26 168 18 188";
const P_COLLAR_L = "M72 78L40 30L66 46L84 40L92 76Z";
const P_COLLAR_R = "M128 78L160 30L134 46L116 40L108 76Z";
const P_COLLAR_LINE = "M48 44L74 70M152 44L126 70";
const P_SUIT = "M84 76L100 150L116 76Q100 86 84 76Z";
const P_HEAD = "M76 52C76 30 88 20 100 20C112 20 124 30 124 52C124 70 112 84 100 86C88 84 76 70 76 52Z";
const P_HEAD_SHADE = "M112 24C122 32 126 44 124 58C122 72 114 82 104 86C114 70 116 42 112 24Z";
const P_HAIR = "M76 50C74 26 88 14 102 15C116 16 126 30 124 50C118 38 112 32 100 34C106 40 96 46 90 36C84 40 80 44 76 50Z";
const P_HAIR_SHINE = "M86 24Q98 16 112 22";
const P_HAND = "M128 134C122 130 118 138 120 146C122 152 130 154 136 150Z";
const P_BOX = "M126 128L152 120L178 130L178 164L152 174L126 164Z";
const P_BOX_TOP = "M126 128L152 120L178 130L152 138Z";

/** The Prize Vampire. `pose` is ignored; one pose only. */
export function MonsterPrizeVampire({ className }: MonsterProps): ReactElement {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <defs>
        <linearGradient id="th-pvamp-cape" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("monster-prize")} />
          <stop offset="0.55" style={stop("monster-prize", 0.55)} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <linearGradient id="th-pvamp-collar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("monster-prize")} />
          <stop offset="1" style={stop("ground", 0.85)} />
        </linearGradient>
        <linearGradient id="th-pvamp-skin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("moon")} />
          <stop offset="1" style={stop("moon", 0.7)} />
        </linearGradient>
        <radialGradient id="th-pvamp-aura" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("monster-prize", 0.4)} />
          <stop offset="1" style={stop("monster-prize", 0)} />
        </radialGradient>
        <radialGradient id="th-pvamp-eye" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("lantern", 0.9)} />
          <stop offset="1" style={stop("lantern", 0)} />
        </radialGradient>
        <linearGradient id="th-pvamp-box" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("stone")} />
          <stop offset="0.5" style={stop("monster-prize", 0.7)} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
      </defs>
      <g data-part="aura">
        <ellipse cx="100" cy="108" rx="96" ry="88" style={pgrad("aura")} />
      </g>
      <g data-part="cape">
        <path d={P_CAPE} style={pgrad("cape")} />
        <path d={P_CAPE_SHADOW} style={fill("ground", 0.4)} />
        <path d={P_COLLAR_L} style={pgrad("collar")} />
        <path d={P_COLLAR_R} style={pgrad("collar")} />
        <path d={P_COLLAR_L} strokeWidth="1.5" strokeLinejoin="round" style={stroke("ground", 0.7)} />
        <path d={P_COLLAR_R} strokeWidth="1.5" strokeLinejoin="round" style={stroke("ground", 0.7)} />
        <path d={P_CAPE_RIM} strokeWidth="2.5" strokeLinecap="round" style={stroke("moon", 0.75)} />
        <path d="M40 30L66 46" strokeWidth="2" strokeLinecap="round" style={stroke("moon", 0.8)} />
        <g data-part="cape-detail">
          <path d="M60 110C54 140 48 166 42 186M88 130C86 150 84 170 82 190M118 130C120 150 122 170 124 190M142 112C146 140 152 164 156 186" strokeWidth="1.2" strokeLinecap="round" style={stroke("ground", 0.4)} />
          <path d={P_COLLAR_LINE} strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.45)} />
          <path d="M24 184Q36 176 48 190M150 190Q164 178 178 186" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.4)} />
        </g>
      </g>
      <g data-part="body">
        <path d={P_SUIT} style={fill("ground", 0.9)} />
        <path d="M100 82L94 100L100 150L106 100Z" style={fill("moon", 0.85)} />
        <circle cx="100" cy="96" r="3" style={fill("lantern")} />
        <g data-part="body-detail">
          <path d="M92 104V120M108 104V120M96 130V144M104 130V144" strokeWidth="1" strokeLinecap="round" style={stroke("monster-prize", 0.6)} />
          <circle cx="100" cy="96" r="5.5" strokeWidth="0.8" style={stroke("moon", 0.6)} />
        </g>
      </g>
      <g data-part="face">
        <path d={P_HEAD} style={pgrad("skin")} />
        <path d={P_HEAD_SHADE} style={fill("ground", 0.25)} />
        <path d={P_HAIR} style={fill("ground")} />
        <path d={P_HAIR_SHINE} strokeWidth="2" strokeLinecap="round" style={stroke("moon", 0.7)} />
        <path d="M82 50L94 56M118 50L106 56" strokeWidth="2.4" strokeLinecap="round" style={stroke("ground")} />
        <circle cx="89" cy="58" r="8" style={pgrad("eye")} />
        <circle cx="111" cy="58" r="8" style={pgrad("eye")} />
        <ellipse cx="89" cy="58" rx="3.2" ry="3.6" style={fill("lantern")} />
        <ellipse cx="111" cy="58" rx="3.2" ry="3.6" style={fill("lantern")} />
        <path d="M100 60L97 70H103Z" style={fill("ground", 0.3)} />
        <path d="M88 74Q100 80 112 74Q100 84 88 74Z" style={fill("ground")} />
        <path d="M91 76L94 87L97 77ZM103 77L106 87L109 76Z" style={fill("moon")} />
        <g data-part="face-detail">
          <path d="M84 66Q86 70 88 68M112 68Q114 70 116 66" strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.4)} />
          <path d="M82 36Q90 30 100 31M96 38Q106 36 114 40" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.4)} />
          <circle cx="86.5" cy="56" r="1" style={fill("moon")} />
          <circle cx="108.5" cy="56" r="1" style={fill("moon")} />
        </g>
      </g>
      <g data-part="giftbox">
        <path d={P_BOX} style={pgrad("box")} />
        <path d="M152 138L178 130V164L152 174Z" style={fill("ground", 0.35)} />
        <path d={P_BOX_TOP} style={fill("moon", 0.35)} />
        <path d="M152 120V174" strokeWidth="5" style={stroke("lantern")} />
        <path d="M126 146L152 156L178 146" strokeWidth="5" strokeLinejoin="round" style={stroke("lantern")} />
        <path d="M152 124C140 108 128 112 134 120C138 126 148 124 152 124C156 124 166 126 170 120C176 112 164 108 152 124Z" style={fill("lantern")} />
        <circle cx="152" cy="124" r="3.4" style={fill("ground", 0.55)} />
        <path d={P_BOX} strokeWidth="1.5" strokeLinejoin="round" style={stroke("ground", 0.7)} />
        <path d={P_HAND} style={pgrad("skin")} />
        <path d="M120 140L130 144M120 146L130 149" strokeWidth="1.6" strokeLinecap="round" style={stroke("ground", 0.6)} />
        <path d="M128 130L126 164" strokeWidth="1.5" strokeLinecap="round" style={stroke("moon", 0.7)} />
        <g data-part="giftbox-detail">
          <path d="M132 138L140 142M164 168L172 165M160 128L170 132" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.5)} />
          <circle cx="146" cy="122" r="1" style={fill("moon", 0.9)} />
          <circle cx="132" cy="116" r="0.9" style={fill("moon", 0.8)} />
        </g>
      </g>
      <g data-part="mist-detail">
        <path d="M14 192Q56 184 100 194T186 190" strokeWidth="2" strokeLinecap="round" style={stroke("stone", 0.6)} />
      </g>
    </svg>
  );
}

/* ---------- Task 8.3: the Job Zombie ----------
 * Stitched head and cracked skin, torn suit, a briefcase and a loosened tie.
 * Tokens: `--th-monster-job-bait` (skin, base), `--th-ground` (dark suit, shade),
 * `--th-moon` (rim light, highlights), `--th-stone` (suit cloth, case metal) and
 * `--th-lantern` (glowing eyes, tie). */

const zgrad = (id: string): CSSProperties => ({ fill: `url(#th-jzombie-${id})` });

const Z_SUIT =
  "M62 98C46 104 40 124 38 150L34 192H166L162 150C160 124 154 104 138 98L120 92H80Z";
const Z_SUIT_SHADE = "M132 98C150 106 158 126 162 150L166 192H140C146 160 142 120 132 98Z";
const Z_SUIT_RIM = "M62 98C46 104 40 124 38 150L34 192";
const Z_TEAR = "M40 160L48 168L42 176L52 184L46 192H34Z";
const Z_LAPEL_L = "M80 92L92 128L76 150L66 112Z";
const Z_LAPEL_R = "M120 92L108 128L124 150L134 112Z";
const Z_SHIRT = "M80 92H120L108 128L100 150L92 128Z";
const Z_NECK = "M88 76H112L114 94Q100 102 86 94Z";
const Z_HEAD =
  "M72 50C70 28 84 16 100 16C116 16 130 28 128 50C128 64 124 76 114 82C108 86 92 86 86 82C76 76 72 64 72 50Z";
const Z_HEAD_SHADE = "M116 20C128 28 130 44 128 54C126 70 120 80 110 84C118 66 120 40 116 20Z";
const Z_HEAD_RIM = "M72 50C70 28 84 16 100 16";
const Z_TIE = "M96 96L106 96L110 104L102 112L112 146L102 158L90 144L98 112L94 102Z";
const Z_ARM_L = "M44 104C30 124 28 150 34 170L48 168C48 150 52 126 62 106Z";
const Z_HAND_L = "M32 168C28 176 32 188 40 190C48 190 52 182 48 168Z";
const Z_HAND_R = "M150 150C146 156 148 168 156 170C164 170 168 162 164 150Z";
const Z_CASE = "M118 158H186V194H118Z";
const Z_CASE_SHADE = "M158 158H186V194H158Z";
const Z_HANDLE = "M140 158V150Q140 144 146 144H158Q164 144 164 150V158";

/** The Job Zombie. `pose` is ignored; one pose only. */
export function MonsterJobZombie({ className }: MonsterProps): ReactElement {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <defs>
        <linearGradient id="th-jzombie-skin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("moon", 0.5)} />
          <stop offset="0.4" style={stop("monster-job-bait")} />
          <stop offset="1" style={stop("monster-job-bait", 0.8)} />
        </linearGradient>
        <linearGradient id="th-jzombie-suit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("stone")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <linearGradient id="th-jzombie-case" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("stone")} />
          <stop offset="0.5" style={stop("stone", 0.7)} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <radialGradient id="th-jzombie-aura" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("monster-job-bait", 0.4)} />
          <stop offset="1" style={stop("monster-job-bait", 0)} />
        </radialGradient>
        <radialGradient id="th-jzombie-eye" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("lantern", 0.9)} />
          <stop offset="1" style={stop("lantern", 0)} />
        </radialGradient>
      </defs>
      <g data-part="aura">
        <ellipse cx="100" cy="106" rx="96" ry="90" style={zgrad("aura")} />
      </g>
      <g data-part="suit">
        <path d={Z_ARM_L} style={zgrad("suit")} />
        <path d={Z_SUIT} style={zgrad("suit")} />
        <path d={Z_SUIT_SHADE} style={fill("ground", 0.45)} />
        <path d={Z_SHIRT} style={fill("moon", 0.85)} />
        <path d={Z_LAPEL_L} style={fill("ground", 0.8)} />
        <path d={Z_LAPEL_R} style={fill("ground", 0.8)} />
        <path d={Z_TIE} style={fill("lantern")} />
        <path d="M96 96L106 96L110 104L102 100Z" style={fill("ground", 0.5)} />
        <path d="M104 116L112 146L102 158L106 130Z" style={fill("ground", 0.35)} />
        <path d={Z_SUIT_RIM} strokeWidth="2.5" strokeLinecap="round" style={stroke("moon", 0.7)} />
        <path d={Z_TEAR} style={fill("monster-job-bait", 0.55)} />
        <g data-part="suit-detail">
          <path d="M60 112C54 130 52 150 54 172M146 114C148 134 148 154 146 176M72 160L70 190" strokeWidth="1.2" strokeLinecap="round" style={stroke("ground", 0.45)} />
          <path d="M40 160L48 168L42 176L52 184L46 192" strokeWidth="1" strokeLinejoin="round" style={stroke("moon", 0.5)} />
          <path d="M126 124L132 130M128 124L134 130M126 130L132 124" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.5)} />
          <path d="M98 102L104 134M94 104L102 150" strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.4)} />
          <path d="M84 96L90 106M116 96L110 106" strokeWidth="1.4" strokeLinecap="round" style={stroke("moon", 0.5)} />
        </g>
      </g>
      <g data-part="body">
        <path d={Z_NECK} style={zgrad("skin")} />
        <path d="M88 84L114 84L114 94Q100 100 86 94Z" style={fill("ground", 0.3)} />
        <path d={Z_HAND_L} style={zgrad("skin")} />
        <path d={Z_HAND_R} style={zgrad("skin")} />
        <g data-part="body-detail">
          <path d="M34 178L40 182M38 174L44 180M150 156L158 160" strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.55)} />
          <path d="M90 88L98 92L92 96" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={stroke("ground", 0.6)} />
        </g>
      </g>
      <g data-part="face">
        <path d={Z_HEAD} style={zgrad("skin")} />
        <path d={Z_HEAD_SHADE} style={fill("ground", 0.3)} />
        <path d="M74 38C76 24 88 18 100 18C92 24 86 30 84 40Z" style={fill("ground", 0.55)} />
        <path d={Z_HEAD_RIM} strokeWidth="2.2" strokeLinecap="round" style={stroke("moon", 0.8)} />
        <ellipse cx="88" cy="52" rx="9" ry="8" style={fill("ground")} />
        <ellipse cx="113" cy="56" rx="6" ry="5" style={fill("ground")} />
        <circle cx="88" cy="53" r="9" style={zgrad("eye")} />
        <circle cx="113" cy="57" r="7" style={zgrad("eye")} />
        <circle cx="88" cy="53" r="3.2" style={fill("lantern")} />
        <circle cx="113" cy="57" r="2.2" style={fill("lantern")} />
        <path d="M80 42L96 46M106 48L122 46" strokeWidth="2.4" strokeLinecap="round" style={stroke("ground")} />
        <path d="M99 60L95 70H101Z" style={fill("ground", 0.35)} />
        <path d="M86 72Q100 78 116 70" strokeWidth="2.4" strokeLinecap="round" style={stroke("ground")} />
        <g data-part="face-detail">
          <path d="M86 70V76M92 72V78M98 74V79M104 74V79M110 72V77" strokeWidth="1.2" strokeLinecap="round" style={stroke("ground", 0.8)} />
          <path d="M100 18V34M94 22H106M94 28H106" strokeWidth="1.1" strokeLinecap="round" style={stroke("ground", 0.8)} />
          <path d="M118 30L112 40L118 46L114 54M78 60L84 66L80 72" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={stroke("ground", 0.6)} />
          <path d="M122 62L126 66M76 50L80 54" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.5)} />
          <circle cx="85.5" cy="50.5" r="1" style={fill("moon")} />
          <circle cx="111" cy="55" r="0.8" style={fill("moon")} />
        </g>
      </g>
      <g data-part="briefcase">
        <path d={Z_HANDLE} strokeWidth="4" strokeLinecap="round" style={stroke("stone")} />
        <path d={Z_CASE} style={zgrad("case")} />
        <path d={Z_CASE_SHADE} style={fill("ground", 0.35)} />
        <path d="M118 158H186" strokeWidth="2" strokeLinecap="round" style={stroke("moon", 0.8)} />
        <path d="M118 172H186" strokeWidth="1.5" style={stroke("ground", 0.7)} />
        <rect x="146" y="168" width="12" height="8" rx="2" style={fill("lantern")} />
        <rect x="124" y="166" width="6" height="8" rx="1.5" style={fill("ground", 0.8)} />
        <path d={Z_CASE} strokeWidth="1.5" strokeLinejoin="round" style={stroke("ground", 0.7)} />
        <path d="M148 158V150M156 158V150" strokeWidth="3" strokeLinecap="round" style={stroke("monster-job-bait")} />
        <g data-part="briefcase-detail">
          <path d="M122 162V190M176 176L182 182M130 184L146 188" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.45)} />
          <path d="M170 160L174 168L170 172" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={stroke("ground", 0.6)} />
          <circle cx="152" cy="172" r="1.2" style={fill("ground", 0.8)} />
        </g>
      </g>
      <g data-part="mist-detail">
        <path d="M10 194Q50 186 100 196T190 192" strokeWidth="2" strokeLinecap="round" style={stroke("stone", 0.6)} />
      </g>
    </svg>
  );
}

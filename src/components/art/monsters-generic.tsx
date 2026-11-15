import type { CSSProperties, ReactElement } from "react";

/**
 * Monster art (hunter-ui design B3). Task 8.5: the Generic Shade, a hooded shape
 * with an empty face, two glints and drifting smoke tails. Task 8.6: the Neutral
 * Candle (melted-wax candle in a holder, calm layered flame, small moth, soft glow;
 * tokens `--th-monster-neutral`, `--th-ground`, `--th-moon`, `--th-stone`,
 * `--th-lantern`). Decorative only: no text, no title, no filter, no
 * animate. Colors come only from tokens: `--th-monster-generic` (base),
 * `--th-ground` (dark), `--th-moon` (light and rim), `--th-lantern` (glints) and
 * `--th-fog` (smoke). Fine details sit in `-detail` groups (hidden in high contrast).
 */

export interface GenericMonsterProps {
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

/** Cloak: pointed hood, wide shoulders, a ragged hem that thins into smoke. */
const CLOAK =
  "M100 22C74 22 58 44 58 70C58 86 52 100 44 118C36 138 30 156 24 176L38 168L48 184L60 170L70 188" +
  "L82 174L92 190L102 176L114 192L124 174L136 188L144 170L156 184L164 168L176 176C170 156 164 138 156 118" +
  "C148 100 142 86 142 70C142 44 126 22 100 22Z";
const CLOAK_SHADOW =
  "M100 22C126 22 142 44 142 70C142 86 148 100 156 118C164 138 170 156 176 176L164 168L156 184L144 170" +
  "L136 188L124 174L114 192C120 160 118 120 112 90C110 60 108 40 100 22Z";
const CLOAK_RIM = "M100 22C74 22 58 44 58 70C58 86 52 100 44 118C36 138 30 156 24 176";
const FOLDS =
  "M78 96C72 120 68 146 64 170M92 104C90 128 88 152 86 176M122 100C124 126 128 150 132 172M108 108C110 130 112 154 112 178";
const HEM_TEARS = "M52 176L56 164M96 180L98 168M140 176L136 164";

/** Hood: an arch around the face, with a lip that falls over the brow. */
const HOOD =
  "M100 22C72 22 54 46 54 74C54 90 62 100 70 104C74 96 82 90 100 90C118 90 126 96 130 104" +
  "C138 100 146 90 146 74C146 46 128 22 100 22Z";
const HOOD_SHADOW = "M100 22C128 22 146 46 146 74C146 90 138 100 130 104C128 98 124 94 118 92C128 70 120 40 100 22Z";
const HOOD_RIM = "M100 22C72 22 54 46 54 74C54 84 58 94 64 100";
const FACE_VOID = "M100 44C82 44 72 60 72 76C72 92 84 104 100 104C116 104 128 92 128 76C128 60 118 44 100 44Z";

/** Three smoke tails drifting off the hem, one off each shoulder. */
const SMOKE_L = "M30 172C14 166 8 152 18 142C26 134 18 124 10 122C24 118 36 128 30 140C26 150 36 158 42 160Z";
const SMOKE_R = "M170 172C186 166 192 152 182 142C174 134 182 124 190 122C176 118 164 128 170 140C174 150 164 158 158 160Z";
const SMOKE_C = "M98 192C84 190 82 182 92 178C100 174 96 168 90 166C104 164 112 172 106 180C102 186 110 190 116 192Z";
const WISPS = "M20 140C14 132 18 124 26 122M180 140C186 132 182 124 174 122M100 196C96 190 100 186 106 186";

/** The Generic Shade. `pose` is ignored; one pose only. */
export function MonsterGenericShade({ className }: GenericMonsterProps): ReactElement {
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
        <linearGradient id="th-shade-cloak" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("moon", 0.55)} />
          <stop offset="0.4" style={stop("monster-generic")} />
          <stop offset="1" style={stop("monster-generic", 0.7)} />
        </linearGradient>
        <linearGradient id="th-shade-hood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("moon", 0.7)} />
          <stop offset="0.5" style={stop("monster-generic")} />
          <stop offset="1" style={stop("ground", 0.4)} />
        </linearGradient>
        <radialGradient id="th-shade-void" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" style={stop("ground")} />
          <stop offset="0.75" style={stop("ground", 0.95)} />
          <stop offset="1" style={stop("ground", 0.7)} />
        </radialGradient>
        <linearGradient id="th-shade-smoke" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" style={stop("fog", 0.1)} />
          <stop offset="1" style={stop("monster-generic", 0.55)} />
        </linearGradient>
        <radialGradient id="th-shade-aura" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("monster-generic", 0.35)} />
          <stop offset="1" style={stop("monster-generic", 0)} />
        </radialGradient>
        <radialGradient id="th-shade-glint" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("lantern", 0.95)} />
          <stop offset="1" style={stop("lantern", 0)} />
        </radialGradient>
      </defs>
      <g data-part="aura">
        <ellipse cx="100" cy="104" rx="96" ry="94" style={grad("aura")} />
      </g>
      <g data-part="smoke">
        <path d={SMOKE_L} style={grad("smoke")} />
        <path d={SMOKE_R} style={grad("smoke")} />
        <path d={SMOKE_C} style={grad("smoke")} />
        <g data-part="smoke-detail">
          <path d={WISPS} strokeWidth="1.5" strokeLinecap="round" style={stroke("fog", 0.8)} />
          <path d="M26 156C22 150 24 146 30 144M174 156C178 150 176 146 170 144" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.35)} />
        </g>
      </g>
      <g data-part="body">
        <path d={CLOAK} style={grad("cloak")} />
        <path d={CLOAK_SHADOW} style={fill("ground", 0.35)} />
        <path d="M70 104C84 112 116 112 130 104L136 128C116 138 84 138 64 128Z" style={fill("ground", 0.3)} />
        <path d={CLOAK_RIM} strokeWidth="2.5" strokeLinecap="round" style={stroke("moon", 0.8)} />
        <g data-part="body-detail">
          <path d={FOLDS} strokeWidth="1.2" strokeLinecap="round" style={stroke("ground", 0.5)} />
          <path d="M72 100C66 126 60 150 54 172M96 112C94 134 92 158 90 180" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.35)} />
          <path d={HEM_TEARS} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={stroke("ground", 0.55)} />
          <path d="M64 130Q76 124 88 130M114 134Q126 128 138 134" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.4)} />
        </g>
      </g>
      <g data-part="hood">
        <path d={HOOD} style={grad("hood")} />
        <path d={HOOD_SHADOW} style={fill("ground", 0.35)} />
        <path d={HOOD_RIM} strokeWidth="2.5" strokeLinecap="round" style={stroke("moon", 0.85)} />
        <g data-part="hood-detail">
          <path d="M66 70C66 54 78 38 92 32M134 70C134 54 124 40 112 34" strokeWidth="1.2" strokeLinecap="round" style={stroke("moon", 0.4)} />
          <path d="M60 84C60 94 64 100 70 104M140 84C140 94 136 100 130 104" strokeWidth="1.2" strokeLinecap="round" style={stroke("ground", 0.55)} />
          <path d="M100 24V40" strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.45)} />
        </g>
      </g>
      <g data-part="face">
        <path d={FACE_VOID} style={grad("void")} />
        <path d="M76 66C78 54 86 48 96 46" strokeWidth="1.5" strokeLinecap="round" style={stroke("moon", 0.4)} />
        <circle cx="88" cy="74" r="7" style={grad("glint")} />
        <circle cx="112" cy="74" r="7" style={grad("glint")} />
        <ellipse cx="88" cy="74" rx="2.6" ry="3.6" style={fill("lantern")} />
        <ellipse cx="112" cy="74" rx="2.6" ry="3.6" style={fill("lantern")} />
        <g data-part="face-detail">
          <circle cx="87" cy="72.8" r="0.9" style={fill("moon")} />
          <circle cx="111" cy="72.8" r="0.9" style={fill("moon")} />
          <path d="M80 94Q100 102 120 94" strokeWidth="1" strokeLinecap="round" style={stroke("fog", 0.5)} />
        </g>
      </g>
    </svg>
  );
}

/* ---------- Neutral Candle ---------- */

const cgrad = (id: string): CSSProperties => ({ fill: `url(#th-candle-${id})` });

/** Candle body: a slightly bowed column with an uneven melted top edge. */
const WAX = "M78 92C78 88 84 86 90 88C96 90 100 86 106 88C112 90 120 88 122 92L124 158L76 158Z";
const WAX_SHADOW = "M104 90C112 90 120 88 122 92L124 158L104 158C108 130 108 110 104 90Z";
const WAX_RIM = "M80 94L78 156";
const WAX_POOL = "M76 92C82 98 92 96 100 98C110 100 118 96 124 92C122 86 112 84 100 86C88 84 78 86 76 92Z";
const DRIPS = "M82 94C80 106 82 114 86 114C90 114 90 104 88 96M110 96C108 112 110 124 114 124C118 124 118 108 116 98";
const DRIP_WAX = "M82 94C80 106 82 114 86 114C90 114 90 104 88 96ZM110 96C108 112 110 124 114 124C118 124 118 108 116 98Z";

/** Holder: a small dish with a rim, a stem and a round foot. */
const DISH = "M62 156C62 152 70 150 100 150C130 150 138 152 138 156C138 166 124 172 100 172C76 172 62 166 62 156Z";
const DISH_SHADOW = "M100 150C130 150 138 152 138 156C138 166 124 172 100 172C112 168 116 160 100 150Z";
const FOOT = "M74 176C74 172 84 170 100 170C116 170 126 172 126 176L132 186L68 186Z";
const FOOT_SHADOW = "M100 170C116 170 126 172 126 176L132 186L100 186Z";
const HOLDER_RIM = "M64 155C68 151 84 150 100 150";

/** Flame: outer teardrop, inner teardrop, bright core. Calm and upright. */
const FLAME_OUTER = "M100 38C112 54 116 68 112 78C109 86 104 88 100 88C96 88 91 86 88 78C84 68 88 54 100 38Z";
const FLAME_INNER = "M100 52C107 62 109 72 106 79C104 84 102 85 100 85C98 85 96 84 94 79C91 72 93 62 100 52Z";
const FLAME_CORE = "M100 68C103 72 104 77 102 81C101 83 99 83 98 81C96 77 97 72 100 68Z";

/** Moth: two soft wings and a small body, resting on the holder rim. */
const MOTH_WING_L = "M142 120C132 108 122 112 124 124C126 134 136 136 142 128Z";
const MOTH_WING_R = "M142 120C152 108 162 112 160 124C158 134 148 136 142 128Z";
const MOTH_BODY = "M142 116C145 116 146 124 144 132C143 135 141 135 140 132C138 124 139 116 142 116Z";

/** The Neutral Candle. `pose` is ignored; one pose only. */
export function MonsterNeutralCandle({ className }: GenericMonsterProps): ReactElement {
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
        <radialGradient id="th-candle-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("lantern", 0.5)} />
          <stop offset="0.5" style={stop("monster-neutral", 0.22)} />
          <stop offset="1" style={stop("monster-neutral", 0)} />
        </radialGradient>
        <linearGradient id="th-candle-wax" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={stop("moon", 0.85)} />
          <stop offset="0.35" style={stop("monster-neutral")} />
          <stop offset="1" style={stop("monster-neutral", 0.75)} />
        </linearGradient>
        <linearGradient id="th-candle-holder" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("stone")} />
          <stop offset="1" style={stop("ground", 0.8)} />
        </linearGradient>
        <linearGradient id="th-candle-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("lantern", 0.85)} />
          <stop offset="1" style={stop("monster-neutral")} />
        </linearGradient>
        <linearGradient id="th-candle-wing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("moon", 0.8)} />
          <stop offset="1" style={stop("stone", 0.7)} />
        </linearGradient>
      </defs>
      <g data-part="glow">
        <circle cx="100" cy="80" r="78" style={cgrad("glow")} />
        <ellipse cx="100" cy="176" rx="70" ry="10" style={fill("ground", 0.35)} />
      </g>
      <g data-part="holder">
        <path d={FOOT} style={cgrad("holder")} />
        <path d={FOOT_SHADOW} style={fill("ground", 0.35)} />
        <path d={DISH} style={cgrad("holder")} />
        <path d={DISH_SHADOW} style={fill("ground", 0.35)} />
        <path d={HOLDER_RIM} strokeWidth="2" strokeLinecap="round" style={stroke("moon", 0.7)} />
        <g data-part="holder-detail">
          <path d="M74 178L72 184M126 178L128 184M84 163C92 167 108 167 116 163" strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.5)} />
          <path d="M70 182H96" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.35)} />
        </g>
      </g>
      <g data-part="body">
        <path d={WAX} style={cgrad("wax")} />
        <path d={WAX_SHADOW} style={fill("ground", 0.3)} />
        <path d={WAX_POOL} style={fill("moon", 0.35)} />
        <path d={DRIP_WAX} style={fill("monster-neutral")} />
        <path d={WAX_RIM} strokeWidth="2" strokeLinecap="round" style={stroke("moon", 0.85)} />
        <g data-part="body-detail">
          <path d={DRIPS} strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.45)} />
          <path d="M88 110C88 124 87 140 86 154M96 120C96 134 95 146 95 156" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.4)} />
          <path d="M100 86V92" strokeWidth="1.6" strokeLinecap="round" style={stroke("ground", 0.8)} />
          <path d="M112 132C116 134 118 140 116 146" strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.4)} />
        </g>
      </g>
      <g data-part="flame" className="th-flicker">
        <path d={FLAME_OUTER} style={cgrad("flame")} />
        <path d={FLAME_INNER} style={fill("lantern", 0.9)} />
        <path d={FLAME_CORE} style={fill("moon")} />
        <path d="M92 76C90 66 94 54 100 44" strokeWidth="1.5" strokeLinecap="round" style={stroke("moon", 0.6)} />
        <g data-part="flame-detail">
          <path d="M100 88V84" strokeWidth="1.4" strokeLinecap="round" style={stroke("ground", 0.7)} />
          <circle cx="112" cy="46" r="1.2" style={fill("lantern", 0.8)} />
          <circle cx="90" cy="40" r="0.9" style={fill("lantern", 0.7)} />
        </g>
      </g>
      <g data-part="moth">
        <path d={MOTH_WING_L} style={cgrad("wing")} />
        <path d={MOTH_WING_R} style={cgrad("wing")} />
        <path d={MOTH_BODY} style={fill("ground", 0.8)} />
        <path d="M141 116C138 111 135 110 133 111M143 116C146 111 149 110 151 111" strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.7)} />
        <g data-part="moth-detail">
          <path d="M139 120C134 118 130 120 128 124M145 120C150 118 154 120 156 124" strokeWidth="0.8" strokeLinecap="round" style={stroke("ground", 0.45)} />
          <circle cx="132" cy="124" r="1.6" style={fill("monster-neutral", 0.7)} />
          <circle cx="152" cy="124" r="1.6" style={fill("monster-neutral", 0.7)} />
        </g>
      </g>
    </svg>
  );
}

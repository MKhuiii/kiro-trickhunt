import type { CSSProperties, ReactElement } from "react";

/**
 * Monster art for new-monsters-v1 (design "Art"). The Investment Goblin is a hunched,
 * grinning goblin (--th-monster-investment) with moon eyes, a coin stack (--th-lantern)
 * and a rising line chart (--th-stone). Gradients live in <defs> with th-igoblin- ids,
 * rim light is --th-moon. Decorative only: no text, no title, no filter, no animate.
 * Fine detail sits in groups whose data-part ends with -detail.
 */

export interface NewMonsterProps {
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

/** Gradient ids carry the `th-igoblin-` prefix so they never clash with other art. */
const grad = (id: string): CSSProperties => ({ fill: `url(#th-igoblin-${id})` });

/** Five coins in the stack: x offset of each coin, bottom to top. Coin k sits at y = 168 - 8k. */
const COIN_OFFSETS: readonly number[] = [0, 2, -1, 1, -2];

const coinTop = (k: number): number => 168 - 8 * k;

/** Short vertical ridges on the edge of coin k (the milled rim). */
const coinRidges = (k: number): string => {
  const dx = COIN_OFFSETS[k] ?? 0;
  const y = coinTop(k);
  let d = "";
  for (let x = 156; x <= 180; x += 4) d += `M${x + dx} ${y + 1.5}V${y + 5.5}`;
  return d;
};

/** The Investment Goblin. `pose` is ignored; one pose only. */

export function MonsterInvestmentGoblin({ className }: NewMonsterProps): ReactElement {
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
        <linearGradient id="th-igoblin-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("monster-investment")} />
          <stop offset="0.55" style={stop("monster-investment", 0.85)} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <radialGradient id="th-igoblin-skin" cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" style={stop("monster-investment")} />
          <stop offset="0.6" style={stop("monster-investment", 0.9)} />
          <stop offset="1" style={stop("ground", 0.85)} />
        </radialGradient>
        <linearGradient id="th-igoblin-arm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("monster-investment")} />
          <stop offset="1" style={stop("ground", 0.8)} />
        </linearGradient>
        <radialGradient id="th-igoblin-light" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("moon", 0.45)} />
          <stop offset="1" style={stop("moon", 0)} />
        </radialGradient>
        <radialGradient id="th-igoblin-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("lantern", 0.5)} />
          <stop offset="1" style={stop("lantern", 0)} />
        </radialGradient>
        <linearGradient id="th-igoblin-coin" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={stop("ground", 0.5)} />
          <stop offset="0.25" style={stop("lantern")} />
          <stop offset="0.5" style={stop("moon", 0.8)} />
          <stop offset="0.72" style={stop("lantern")} />
          <stop offset="1" style={stop("ground", 0.6)} />
        </linearGradient>
        <radialGradient id="th-igoblin-face" cx="0.35" cy="0.35" r="0.8">
          <stop offset="0" style={stop("moon", 0.9)} />
          <stop offset="0.6" style={stop("lantern")} />
          <stop offset="1" style={stop("lantern", 0.8)} />
        </radialGradient>
        <radialGradient id="th-igoblin-eye" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" style={stop("moon")} />
          <stop offset="0.75" style={stop("moon")} />
          <stop offset="1" style={stop("stone")} />
        </radialGradient>
        <linearGradient id="th-igoblin-panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("fog")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <linearGradient id="th-igoblin-cloth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("fog")} />
          <stop offset="1" style={stop("ground", 0.9)} />
        </linearGradient>
      </defs>

      {/* A rising line chart on a dark panel, behind the goblin's shoulder. */}
      <g data-part="chart">
        <rect x="150" y="44" width="46" height="60" rx="4" style={grad("panel")} />
        <rect x="150" y="44" width="46" height="60" rx="4" strokeWidth="2" style={stroke("stone")} />
        <path
          d="M156 96L164 86L171 90L179 70L188 54"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={stroke("stone")}
        />
        <path d="M193 47L182 50L190 58Z" strokeWidth="1.5" strokeLinejoin="round" style={{ ...fill("stone"), stroke: "var(--th-stone)" }} />
        <g data-part="chart-detail">
          <path d="M162 48V100M173 48V100M184 48V100M154 59H194M154 74H194M154 89H194" strokeWidth="0.8" style={stroke("moon", 0.18)} />
          <path d="M155 50V99H193" strokeWidth="1.2" strokeLinecap="round" style={stroke("moon", 0.4)} />
          <path d="M156 94.5L164 84.5L171 88.5L179 68.5L188 52.5" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={stroke("moon", 0.55)} />
          <circle cx="156" cy="96" r="2" style={fill("moon")} />
          <circle cx="164" cy="86" r="2" style={fill("moon")} />
          <circle cx="171" cy="90" r="2" style={fill("moon")} />
          <circle cx="179" cy="70" r="2" style={fill("moon")} />
        </g>
      </g>

      {/* Hunched body: bent back on the left, moon rim light along the spine, shade on the right. */}
      <g data-part="body">
        <path d="M44 176C34 150 38 112 62 92C78 78 108 80 122 96C134 110 134 130 128 146L150 150L156 176Z" style={grad("body")} />
        <path d="M46 172L40 184L48 187L82 187C84 180 80 174 76 172Z M112 172C108 178 110 187 118 187L156 187C158 180 154 174 148 172Z" style={grad("body")} />
        <ellipse cx="68" cy="108" rx="24" ry="20" style={grad("light")} />
        <path d="M122 96C134 110 134 130 128 146L150 150L156 176L112 176C120 150 124 120 122 96Z" style={fill("ground", 0.35)} />
        <path d="M44 176C34 150 38 112 62 92" strokeWidth="2.5" strokeLinecap="round" style={stroke("moon", 0.7)} />
        <path d="M62 92C72 84 88 80 100 82" strokeWidth="1.5" strokeLinecap="round" style={stroke("moon", 0.45)} />
        <g data-part="body-detail">
          <ellipse cx="47" cy="126" rx="3.5" ry="4.5" style={fill("monster-investment")} />
          <ellipse cx="45" cy="142" rx="3.5" ry="4.5" style={fill("monster-investment")} />
          <ellipse cx="52" cy="110" rx="3" ry="4" style={fill("monster-investment")} />
          <path d="M44 124A3.5 4.5 0 0 1 48 121M42 140A3.5 4.5 0 0 1 46 137M50 108A3 4 0 0 1 54 106" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.6)} />
          <path d="M70 100C66 116 68 132 76 146M86 96C84 114 88 130 94 142M104 100C106 112 110 124 108 136" strokeWidth="1.3" strokeLinecap="round" style={stroke("ground", 0.5)} />
          <path d="M112 102L118 112L116 124M116 108L124 110" strokeWidth="1" strokeLinecap="round" style={stroke("fog", 0.7)} />
          <circle cx="74" cy="112" r="1.8" style={fill("ground", 0.5)} />
          <circle cx="98" cy="102" r="1.5" style={fill("ground", 0.5)} />
          <circle cx="60" cy="132" r="1.6" style={fill("ground", 0.5)} />
          <path d="M52 182H60M62 182H70M122 182H130M132 182H140M142 182H150" strokeWidth="1.2" strokeLinecap="round" style={stroke("ground", 0.55)} />
        </g>
      </g>

      {/* A tattered cloth with a belt and a coin-shaped buckle. */}
      <g data-part="loincloth">
        <path d="M52 150L134 150L138 166L128 160L121 172L110 162L101 174L90 162L80 172L71 162L62 170L56 160Z" style={grad("cloth")} />
        <path d="M44 150C72 156 108 156 140 150" strokeWidth="5" strokeLinecap="round" style={stroke("lantern")} />
        <rect x="88" y="146" width="12" height="10" rx="2" style={fill("lantern")} />
        <g data-part="loincloth-detail">
          <path d="M66 156C68 160 68 164 66 168M84 158C86 162 86 166 84 170M104 158C106 162 108 166 106 170M124 156C124 160 126 164 128 166" strokeWidth="1.2" strokeLinecap="round" style={stroke("moon", 0.25)} />
          <path d="M46 153C72 159 108 159 138 153" strokeWidth="1" strokeDasharray="3 3" style={stroke("ground", 0.6)} />
          <rect x="91" y="149" width="6" height="4" rx="1" style={fill("ground", 0.7)} />
          <path d="M60 163L64 166M96 168L99 171M118 165L121 168" strokeWidth="1.2" strokeLinecap="round" style={stroke("moon", 0.35)} />
        </g>
      </g>

      {/* A stack of five lantern-coloured coins, each with a rim and a top face. */}
      <g data-part="coins">
        <circle cx="168" cy="152" r="36" style={grad("glow")} />
        <ellipse cx="190" cy="178" rx="8" ry="3" style={fill("ground", 0.5)} />
        {COIN_OFFSETS.map((dx, k) => {
          const y = coinTop(k);
          return (
            <g key={k}>
              <path
                d={`M${151 + dx} ${y}V${y + 8}A17 5 0 0 0 ${185 + dx} ${y + 8}V${y}Z`}
                strokeWidth="1"
                style={{ ...grad("coin"), stroke: "var(--th-ground)", strokeOpacity: 0.7 }}
              />
              <ellipse cx={168 + dx} cy={y} rx="17" ry="5" strokeWidth="1" style={{ ...grad("face"), stroke: "var(--th-ground)", strokeOpacity: 0.6 }} />
            </g>
          );
        })}
        <circle cx="192" cy="170" r="6" strokeWidth="1" style={{ ...grad("face"), stroke: "var(--th-ground)", strokeOpacity: 0.6 }} />
        <path d="M151 136V164" strokeWidth="1.8" strokeLinecap="round" style={stroke("moon", 0.6)} />
        <g data-part="coins-detail">
          <path d={COIN_OFFSETS.map((_, k) => coinRidges(k)).join("")} strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.45)} />
          <ellipse cx="166" cy="136" rx="11" ry="3" strokeWidth="1" style={stroke("ground", 0.4)} />
          <path d="M158 134.5A11 3 0 0 1 166 132.5" strokeWidth="1.4" strokeLinecap="round" style={stroke("moon", 0.9)} />
          <path d="M166 133.5L169 136L166 138.5L163 136Z" style={fill("ground", 0.45)} />
          <path d="M156 150L160 150M155 158L159 158" strokeWidth="1.6" strokeLinecap="round" style={stroke("moon", 0.8)} />
          <path d="M187 124V132M183 128H191" strokeWidth="1.2" strokeLinecap="round" style={stroke("moon", 0.9)} />
          <path d="M147 146V152M144 149H150" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.7)} />
          <path d="M189 168A5 5 0 0 1 193 165" strokeWidth="1.2" strokeLinecap="round" style={stroke("moon", 0.8)} />
        </g>
      </g>

      {/* The reaching arm and the clawed hand that guards the top coin. */}
      <g data-part="arm">
        <path d="M108 98C132 90 152 110 162 128L152 138C140 130 124 124 110 118Z" style={grad("arm")} />
        <path d="M150 128C152 120 166 120 172 126C176 132 172 138 164 138C156 138 150 136 150 128Z" style={grad("arm")} />
        <path d="M154 136L152 144L159 138ZM162 138L162 146L167 138ZM170 135L175 141L174 132Z" style={fill("moon")} />
        <path d="M108 98C132 90 152 110 162 128" strokeWidth="2" strokeLinecap="round" style={stroke("moon", 0.6)} />
        <g data-part="arm-detail">
          <path d="M122 100C128 106 130 112 128 120M136 102C140 108 144 114 144 122" strokeWidth="1.2" strokeLinecap="round" style={stroke("ground", 0.5)} />
          <path d="M156 126C158 124 162 124 164 126M162 132C164 130 168 130 170 132" strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.6)} />
          <path d="M120 112L126 108L132 110" strokeWidth="1" strokeLinecap="round" style={stroke("fog", 0.7)} />
          <path d="M152 144L157 139M162 146L163 140M174 141L171 136" strokeWidth="0.8" strokeLinecap="round" style={stroke("ground", 0.5)} />
        </g>
      </g>

      {/* Long pointed ears, behind the head. */}
      <g data-part="ears">
        <path d="M74 46C62 44 46 38 30 24C36 46 48 66 74 66Z" style={grad("body")} />
        <path d="M126 46C138 44 154 38 170 24C164 46 152 66 126 66Z" style={grad("body")} />
        <path d="M70 50C60 48 50 44 42 36C46 50 54 60 70 62Z" style={fill("ground", 0.45)} />
        <path d="M130 50C140 48 150 44 158 36C154 50 146 60 130 62Z" style={fill("ground", 0.55)} />
        <path d="M74 46C62 44 46 38 30 24" strokeWidth="2" strokeLinecap="round" style={stroke("moon", 0.7)} />
        <g data-part="ears-detail">
          <path d="M66 54C58 52 52 48 46 42M64 58C58 58 54 56 50 52M134 54C142 52 148 48 154 42M136 58C142 58 146 56 150 52" strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.55)} />
          <path d="M36 32C42 40 48 48 58 56" strokeWidth="0.8" strokeLinecap="round" style={stroke("fog", 0.7)} />
        </g>
      </g>

      {/* Big head with a heavy brow and a hooked nose; light from the upper left. */}
      <g data-part="head">
        <path d="M70 52C70 34 84 24 100 24C116 24 130 34 130 52C130 70 116 82 100 82C84 82 70 70 70 52Z" style={grad("skin")} />
        <ellipse cx="84" cy="38" rx="14" ry="9" style={grad("light")} />
        <path d="M118 30C128 38 132 52 128 62C124 74 114 82 100 82C112 70 118 50 118 30Z" style={fill("ground", 0.3)} />
        <path d="M98 54C92 62 92 70 100 71C108 70 108 62 102 54Z" style={grad("skin")} />
        <path d="M102 56C107 62 107 68 101 70C108 69 108 62 102 54Z" style={fill("ground", 0.35)} />
        <path d="M74 38L98 45M126 38L102 45" strokeWidth="4" strokeLinecap="round" style={stroke("ground")} />
        <path d="M70 52C70 34 84 24 100 24" strokeWidth="2" strokeLinecap="round" style={stroke("moon", 0.7)} />
        <g data-part="head-detail">
          <path d="M84 32C92 29 108 29 116 32M88 36C94 34 106 34 112 36" strokeWidth="1.1" strokeLinecap="round" style={stroke("ground", 0.4)} />
          <ellipse cx="97" cy="67" rx="1.6" ry="1.1" style={fill("ground", 0.8)} />
          <ellipse cx="104" cy="67" rx="1.6" ry="1.1" style={fill("ground", 0.8)} />
          <path d="M73 58C72 64 74 69 78 72M127 58C128 64 126 69 122 72" strokeWidth="1.1" strokeLinecap="round" style={stroke("ground", 0.5)} />
          <path d="M75 48L71 46M75 51L70 51M125 48L129 46M125 51L130 51" strokeWidth="0.9" strokeLinecap="round" style={stroke("ground", 0.5)} />
          <circle cx="122" cy="56" r="1.8" style={fill("ground", 0.55)} />
          <circle cx="78" cy="62" r="1.4" style={fill("ground", 0.5)} />
          <path d="M88 80H90M96 82H98M104 82H106M112 80H114" strokeWidth="1.1" strokeLinecap="round" style={stroke("ground", 0.45)} />
        </g>
      </g>

      {/* Wide moon eyes with a lantern iris, looking at the coins. */}
      <g data-part="eyes">
        <ellipse cx="86" cy="52" rx="10" ry="8" strokeWidth="1.2" style={{ ...grad("eye"), stroke: "var(--th-ground)" }} />
        <ellipse cx="114" cy="52" rx="10" ry="8" strokeWidth="1.2" style={{ ...grad("eye"), stroke: "var(--th-ground)" }} />
        <circle cx="89" cy="53" r="5.2" style={fill("lantern")} />
        <circle cx="117" cy="53" r="5.2" style={fill("lantern")} />
        <circle cx="89.5" cy="53" r="3" style={fill("ground")} />
        <circle cx="117.5" cy="53" r="3" style={fill("ground")} />
        <g data-part="eyes-detail">
          <circle cx="88" cy="51.5" r="1.2" style={fill("moon")} />
          <circle cx="116" cy="51.5" r="1.2" style={fill("moon")} />
          <path d="M77 49C80 44 92 43 95 46M123 49C120 44 108 43 105 46" strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.55)} />
          <path d="M78 59C82 62 90 62 94 59M106 59C110 62 118 62 122 59" strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.4)} />
          <path d="M85 49V47M91 48V46M113 48V46M119 49V47" strokeWidth="0.8" strokeLinecap="round" style={stroke("stone", 0.7)} />
        </g>
      </g>

      {/* A wide greedy grin with sharp teeth. */}
      <g data-part="mouth">
        <path d="M76 66C88 70 112 70 124 66C122 76 112 81 100 81C88 81 78 76 76 66Z" style={fill("ground")} />
        <path d="M80 67L84 76L88 68ZM89 69L93 78L97 69.5ZM103 69.5L107 78L111 69ZM112 68L116 76L120 67Z" style={fill("moon")} />
        <path d="M96 81L100 75L104 81Z" style={fill("moon")} />
        <path d="M76 66C88 70 112 70 124 66" strokeWidth="1.5" strokeLinecap="round" style={stroke("ground")} />
        <g data-part="mouth-detail">
          <path d="M92 80C96 77 104 77 108 80Z" style={fill("fog")} />
          <path d="M84 76L86 70M93 78L94 72M107 78L106 72M116 76L114 70M100 75L100 79" strokeWidth="0.8" strokeLinecap="round" style={stroke("stone", 0.8)} />
          <path d="M82 67C85 68 87 68 88 68M112 68C114 68 117 68 119 67" strokeWidth="1" strokeLinecap="round" style={stroke("monster-investment", 0.9)} />
          <path d="M77 66L75 63M123 66L125 63" strokeWidth="1.4" strokeLinecap="round" style={stroke("ground", 0.7)} />
        </g>
      </g>
    </svg>
  );
}

/** Gradient ids of the Romance Wraith carry the `th-rwraith-` prefix. */
const wgrad = (id: string): CSSProperties => ({ fill: `url(#th-rwraith-${id})` });

/** The Romance Wraith: a tall hooded cloth ghost with no legs, hollow glowing eyes, a cracked heart in its hands. */

export function MonsterRomanceWraith({ className }: NewMonsterProps): ReactElement {
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
        <linearGradient id="th-rwraith-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("monster-romance", 0.95)} />
          <stop offset="0.55" style={stop("monster-romance", 0.7)} />
          <stop offset="1" style={stop("monster-romance", 0.2)} />
        </linearGradient>
        <linearGradient id="th-rwraith-cloth" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("monster-romance", 0.6)} />
          <stop offset="1" style={stop("ground", 0.6)} />
        </linearGradient>
        <radialGradient id="th-rwraith-hood" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" style={stop("monster-romance")} />
          <stop offset="0.6" style={stop("monster-romance", 0.85)} />
          <stop offset="1" style={stop("ground", 0.8)} />
        </radialGradient>
        <radialGradient id="th-rwraith-light" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("moon", 0.4)} />
          <stop offset="1" style={stop("moon", 0)} />
        </radialGradient>
        <radialGradient id="th-rwraith-eyeglow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("lantern", 0.7)} />
          <stop offset="1" style={stop("lantern", 0)} />
        </radialGradient>
        <radialGradient id="th-rwraith-heartglow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("monster-romance", 0.65)} />
          <stop offset="0.5" style={stop("moon", 0.2)} />
          <stop offset="1" style={stop("monster-romance", 0)} />
        </radialGradient>
        <radialGradient id="th-rwraith-heart" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" style={stop("moon", 0.55)} />
          <stop offset="0.35" style={stop("monster-romance")} />
          <stop offset="1" style={stop("ground", 0.55)} />
        </radialGradient>
        <linearGradient id="th-rwraith-arm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("moon", 0.9)} />
          <stop offset="1" style={stop("fog")} />
        </linearGradient>
        <linearGradient id="th-rwraith-fog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("fog", 0.15)} />
          <stop offset="1" style={stop("fog", 0.8)} />
        </linearGradient>
      </defs>

      {/* A soft glow behind the whole figure and a back layer of mist. */}
      <g data-part="fog">
        <path d="M0 172C30 158 56 178 86 168C116 158 142 178 172 166C184 162 194 166 200 170V200H0Z" style={wgrad("fog")} />
        <ellipse cx="100" cy="176" rx="64" ry="8" style={fill("fog", 0.4)} />
      </g>

      {/* Trailing cloth behind the body: two outer layers with tattered edges. */}
      <g data-part="cloth">
        <path d="M64 90C46 116 30 150 20 186L38 176L46 188L58 174L72 150Z" style={wgrad("cloth")} />
        <path d="M136 90C154 116 170 150 180 186L162 176L154 188L142 174L128 150Z" style={wgrad("cloth")} />
      </g>

      {/* Tall translucent body: no legs, the hem breaks into tatters. Rim light from the upper left. */}
      <g data-part="body">
        <path
          d="M100 12C80 12 64 28 62 50C61 64 66 74 62 88C56 104 46 128 34 168L40 178L50 168L58 182L68 170L78 184L88 172L98 186L108 172L118 184L128 170L138 182L148 168L158 178L164 168C154 128 144 104 138 88C134 74 139 64 138 50C136 28 120 12 100 12Z"
          style={wgrad("body")}
        />
        <path d="M122 100C128 130 136 150 148 170L164 168C154 128 144 104 138 88Z" style={fill("ground", 0.3)} />
        <path d="M92 150L108 150L114 180L100 174L86 182Z" style={fill("monster-romance", 0.45)} />
        <path d="M100 12C80 12 64 28 62 50C61 64 66 74 62 88C56 104 46 128 34 168" strokeWidth="2.5" strokeLinecap="round" style={stroke("moon", 0.7)} />
        <g data-part="body-detail">
          <path d="M80 100C76 128 66 150 56 174M92 152C90 162 86 172 84 182M108 152C110 162 114 172 116 182M120 100C124 128 134 150 144 174" strokeWidth="1.3" strokeLinecap="round" style={stroke("ground", 0.4)} />
          <path d="M72 104C68 126 60 142 50 160M128 104C132 126 140 142 150 160" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.3)} />
          <path d="M50 168L52 158M60 180L61 170M70 170L71 162M80 182L82 172M90 172L90 164M100 184L101 175M110 172L109 164M120 182L119 172M130 170L131 162M140 180L140 170M150 168L152 160" strokeWidth="1.1" strokeLinecap="round" style={stroke("ground", 0.5)} />
          <path d="M98 186V194M118 184L120 192M78 184L76 192" strokeWidth="1.2" strokeLinecap="round" style={stroke("fog", 0.6)} />
          <path d="M26 176L30 168M170 176L168 168" strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.5)} />
        </g>
      </g>

      {/* Deep hood with a dark face void; rim light along its left edge. */}
      <g data-part="hood">
        <path d="M100 12C80 12 62 28 62 52C62 70 68 84 78 94C86 100 114 100 122 94C132 84 138 70 138 52C138 28 120 12 100 12Z" style={wgrad("hood")} />
        <ellipse cx="82" cy="32" rx="14" ry="10" style={wgrad("light")} />
        <path d="M100 26C84 26 74 40 74 56C74 72 84 84 100 90C116 84 126 72 126 56C126 40 116 26 100 26Z" style={fill("ground")} />
        <path d="M100 12C80 12 62 28 62 52" strokeWidth="2.5" strokeLinecap="round" style={stroke("moon", 0.75)} />
        <path d="M100 26C84 26 74 40 74 56C74 72 84 84 100 90" strokeWidth="1.5" strokeLinecap="round" style={stroke("moon", 0.4)} />
        <g data-part="hood-detail">
          <path d="M68 40C65 56 69 72 76 86M132 40C135 56 131 72 124 86M80 20C74 28 70 36 69 46" strokeWidth="1.2" strokeLinecap="round" style={stroke("ground", 0.45)} />
          <path d="M92 90L90 98M108 90L110 98" strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.5)} />
          <path d="M84 70C92 78 108 78 116 70" strokeWidth="1" strokeLinecap="round" style={stroke("stone", 0.5)} />
        </g>
      </g>

      {/* Two hollow eyes: dark sockets with a moon and lantern glow. */}
      <g data-part="eyes">
        <circle cx="88" cy="55" r="14" style={wgrad("eyeglow")} />
        <circle cx="112" cy="55" r="14" style={wgrad("eyeglow")} />
        <ellipse cx="88" cy="55" rx="7" ry="9" strokeWidth="1.4" style={{ ...fill("ground"), stroke: "var(--th-lantern)" }} />
        <ellipse cx="112" cy="55" rx="7" ry="9" strokeWidth="1.4" style={{ ...fill("ground"), stroke: "var(--th-lantern)" }} />
        <ellipse cx="88" cy="56" rx="3" ry="5" style={fill("moon")} />
        <ellipse cx="112" cy="56" rx="3" ry="5" style={fill("moon")} />
        <g data-part="eyes-detail">
          <circle cx="87" cy="53.5" r="1.3" style={fill("lantern")} />
          <circle cx="111" cy="53.5" r="1.3" style={fill("lantern")} />
          <path d="M88 66C88 70 87 74 88 78M112 66C112 70 113 74 112 78" strokeWidth="0.9" strokeLinecap="round" style={stroke("lantern", 0.45)} />
          <path d="M80 48C83 45 90 45 94 47M106 47C110 45 117 45 120 48" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.4)} />
        </g>
      </g>

      {/* Sleeves that fall from the shoulders to the hands. */}
      <g data-part="arms">
        <path d="M62 96C50 114 54 138 72 146L90 146L88 138C76 134 72 120 78 100Z" style={wgrad("cloth")} />
        <path d="M138 96C150 114 146 138 128 146L110 146L112 138C124 134 128 120 122 100Z" style={wgrad("cloth")} />
        <path d="M62 96C50 114 54 138 72 146" strokeWidth="1.8" strokeLinecap="round" style={stroke("moon", 0.55)} />
      </g>

      {/* The heart: monster-romance with a moon rim light and a soft glow behind it. */}
      <g data-part="heart">
        <circle cx="100" cy="128" r="38" style={wgrad("heartglow")} />
        <path
          d="M100 150C80 138 72 124 78 114C83 106 95 107 100 117C105 107 117 106 122 114C128 124 120 138 100 150Z"
          strokeWidth="1.2"
          strokeLinejoin="round"
          style={{ ...wgrad("heart"), stroke: "var(--th-ground)", strokeOpacity: 0.6 }}
        />
        <path d="M100 117C95 107 83 106 78 114C72 124 80 138 100 150" strokeWidth="2.2" strokeLinecap="round" style={stroke("moon", 0.9)} />
        <g data-part="heart-detail">
          <path d="M100 117L96 124L102 130L97 138L101 144M115 110L111 118L117 123" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={stroke("ground", 0.8)} />
          <path d="M86 114C90 120 92 128 90 136M112 130C114 136 110 142 106 146M84 124C88 128 88 134 92 140" strokeWidth="0.9" strokeLinecap="round" style={stroke("moon", 0.4)} />
          <path d="M84 112C87 110 91 111 93 113" strokeWidth="1.2" strokeLinecap="round" style={stroke("moon")} />
          <circle cx="116" cy="118" r="1.5" style={fill("moon", 0.7)} />
        </g>
      </g>

      {/* Thin pale hands with long fingers that cradle the heart from below. */}
      <g data-part="hands">
        <ellipse cx="88" cy="144" rx="9" ry="6" style={wgrad("arm")} />
        <ellipse cx="112" cy="144" rx="9" ry="6" style={wgrad("arm")} />
        <path
          d="M82 140C76 134 74 128 75 122M85 143C77 141 72 135 72 128M88 146C80 147 72 143 70 136M92 139C96 137 98 135 99 132M118 140C124 134 126 128 125 122M115 143C123 141 128 135 128 128M112 146C120 147 128 143 130 136M108 139C104 137 102 135 101 132"
          strokeWidth="3"
          strokeLinecap="round"
          style={stroke("fog")}
        />
        <path d="M82 139C76 134 74 128 75 122" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.8)} />
        <g data-part="hands-detail">
          <circle cx="77.5" cy="133" r="1.3" style={fill("ground", 0.55)} />
          <circle cx="76" cy="138.5" r="1.3" style={fill("ground", 0.55)} />
          <circle cx="78" cy="143.5" r="1.3" style={fill("ground", 0.55)} />
          <circle cx="122.5" cy="133" r="1.3" style={fill("ground", 0.55)} />
          <circle cx="124" cy="138.5" r="1.3" style={fill("ground", 0.55)} />
          <circle cx="122" cy="143.5" r="1.3" style={fill("ground", 0.55)} />
          <path d="M75 125L76 123M73 130L72 128M126 125L125 123M127 130L128 128" strokeWidth="0.8" strokeLinecap="round" style={stroke("ground", 0.6)} />
          <path d="M84 142C88 144 92 144 94 142M106 142C108 144 112 144 116 142" strokeWidth="0.9" strokeLinecap="round" style={stroke("ground", 0.4)} />
        </g>
      </g>

      {/* The hem dissolves into a front layer of mist. */}
      <g data-part="fog-front">
        <path d="M0 188C24 176 50 194 84 186C116 178 142 194 172 184C184 180 194 184 200 188V200H0Z" style={fill("fog", 0.85)} />
        <ellipse cx="60" cy="182" rx="26" ry="5" style={fill("fog", 0.5)} />
        <ellipse cx="146" cy="180" rx="24" ry="5" style={fill("fog", 0.5)} />
      </g>

      {/* Drifting wisps of fog around the figure. */}
      <g data-part="wisps">
        <path d="M22 124C32 112 44 120 38 130C34 136 26 134 28 142" strokeWidth="3.5" strokeLinecap="round" style={stroke("fog", 0.55)} />
        <path d="M178 124C168 112 156 120 162 130C166 136 174 134 172 142" strokeWidth="3.5" strokeLinecap="round" style={stroke("fog", 0.55)} />
        <path d="M150 30C162 24 170 32 164 40" strokeWidth="3" strokeLinecap="round" style={stroke("fog", 0.45)} />
        <path d="M50 28C40 22 32 30 38 38" strokeWidth="3" strokeLinecap="round" style={stroke("fog", 0.45)} />
        <g data-part="wisps-detail">
          <path d="M16 112C22 108 28 110 28 116M184 112C178 108 172 110 172 116M158 20C166 18 172 22 170 28M34 18C26 16 22 22 26 28" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.45)} />
          <circle cx="30" cy="148" r="1.6" style={fill("fog", 0.6)} />
          <circle cx="172" cy="150" r="1.6" style={fill("fog", 0.6)} />
          <circle cx="44" cy="100" r="1.2" style={fill("moon", 0.5)} />
          <circle cx="158" cy="102" r="1.2" style={fill("moon", 0.5)} />
        </g>
      </g>
    </svg>
  );
}

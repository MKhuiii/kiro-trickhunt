import type { CSSProperties, ReactElement } from "react";

/**
 * Monster art (hunter-ui design B3). Task 8.4: the Authority Banshee, a wailing
 * woman with long flowing hair, an open mouth, hollow eyes, a badge-shaped
 * brooch and a torn gown. Decorative only: no text, no title, no filter, no
 * animate. Colors come only from tokens: `--th-monster-authority` (base),
 * `--th-ground` (dark), `--th-moon` (light and rim), `--th-stone` (badge metal),
 * `--th-lantern` (glints) and `--th-fog`. Fine details sit in `-detail` groups
 * (hidden in high contrast).
 */

export interface AuthorityMonsterProps {
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

const grad = (id: string): CSSProperties => ({ fill: `url(#th-banshee-${id})` });

/** Hair mass behind the figure: crown, two long locks at the sides, ragged ends. */
const HAIR =
  "M100 12C68 12 50 36 50 66C50 94 40 118 32 146C28 164 34 178 26 196C46 190 58 176 64 158" +
  "C64 174 62 188 68 198C82 182 84 160 82 136L118 136C116 160 118 182 134 198C140 188 136 174 136 158" +
  "C142 176 154 190 174 196C166 178 172 164 168 146C160 118 150 94 150 66C150 36 132 12 100 12Z";
const HAIR_SHADOW =
  "M100 12C132 12 150 36 150 66C150 94 160 118 168 146C172 164 166 178 174 196C154 190 142 176 136 158" +
  "C136 174 140 188 134 198C124 186 120 170 120 150C132 120 128 60 100 12Z";
const HAIR_RIM = "M100 12C68 12 50 36 50 66C50 94 40 118 32 146";
const STRANDS =
  "M70 30C60 50 62 80 52 110C48 126 44 138 38 160M88 20C74 40 72 70 64 96M130 22C142 44 140 76 148 104C152 120 156 134 162 156" +
  "M36 172Q44 182 40 192M166 170Q158 182 162 192M70 150Q68 168 72 186M130 150Q134 168 130 188";

const GOWN =
  "M84 88C74 92 68 110 64 134C60 154 56 168 50 184L58 176L66 190L76 178L86 192L96 180L106 194" +
  "L116 180L126 192L136 178L146 190L150 184C144 168 140 154 136 134C132 110 126 92 116 88Q100 98 84 88Z";
const GOWN_SHADOW =
  "M116 88C126 92 132 110 136 134C140 154 144 168 150 184L146 190L136 178L126 192L116 180" +
  "C122 150 118 112 108 94Q112 94 116 88Z";
const GOWN_RIM = "M84 88C74 92 68 110 64 134C60 154 56 168 50 184";
const GOWN_TEARS = "M72 150L80 164L74 176M120 154L114 170L122 184M96 140L100 156L94 170";
const SLEEVE_L = "M80 92C60 98 42 114 34 138C42 136 52 130 60 122C68 114 76 108 82 104Z";
const SLEEVE_R = "M120 92C140 98 158 114 166 138C158 136 148 130 140 122C132 114 124 108 118 104Z";

/** Five-point star inside the badge. */
const STAR =
  "M100 100L102.2 105.2L107.8 105.6L103.5 109.2L104.9 114.6L100 111.6L95.1 114.6L96.5 109.2L92.2 105.6L97.8 105.2Z";
const BADGE = "M100 92L112 97V108C112 116 106 121 100 124C94 121 88 116 88 108V97Z";

/** The Authority Banshee. `pose` is ignored; one pose only. */
export function MonsterAuthorityBanshee({ className }: AuthorityMonsterProps): ReactElement {
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
        <linearGradient id="th-banshee-hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("ground", 0.9)} />
          <stop offset="0.45" style={stop("monster-authority", 0.55)} />
          <stop offset="1" style={stop("ground", 0.85)} />
        </linearGradient>
        <linearGradient id="th-banshee-gown" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("moon", 0.6)} />
          <stop offset="0.4" style={stop("monster-authority")} />
          <stop offset="1" style={stop("monster-authority")} />
        </linearGradient>
        <linearGradient id="th-banshee-skin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("moon", 0.8)} />
          <stop offset="0.5" style={stop("monster-authority")} />
          <stop offset="1" style={stop("monster-authority")} />
        </linearGradient>
        <radialGradient id="th-banshee-aura" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("monster-authority", 0.4)} />
          <stop offset="1" style={stop("monster-authority", 0)} />
        </radialGradient>
        <radialGradient id="th-banshee-glint" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("lantern", 0.9)} />
          <stop offset="1" style={stop("lantern", 0)} />
        </radialGradient>
        <linearGradient id="th-banshee-badge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("moon", 0.7)} />
          <stop offset="0.45" style={stop("stone")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
      </defs>
      <g data-part="aura">
        <ellipse cx="100" cy="104" rx="96" ry="94" style={grad("aura")} />
      </g>
      <g data-part="hair">
        <path d={HAIR} style={grad("hair")} />
        <path d={HAIR_SHADOW} style={fill("ground", 0.3)} />
        <path d={HAIR_RIM} strokeWidth="2.5" strokeLinecap="round" style={stroke("moon", 0.75)} />
        <g data-part="hair-detail">
          <path d={STRANDS} strokeWidth="1.2" strokeLinecap="round" style={stroke("moon", 0.35)} />
          <path d="M60 60C56 80 50 100 46 120M140 60C144 80 150 100 154 120" strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.45)} />
        </g>
      </g>
      <g data-part="body">
        <path d={SLEEVE_L} style={grad("gown")} />
        <path d={SLEEVE_R} style={grad("gown")} />
        <path d={SLEEVE_R} style={fill("ground", 0.3)} />
        <path d="M92 76V94H108V76Z" style={grad("skin")} />
        <path d={GOWN} style={grad("gown")} />
        <path d={GOWN_SHADOW} style={fill("ground", 0.35)} />
        <ellipse cx="32" cy="140" rx="5" ry="8" style={grad("skin")} />
        <ellipse cx="168" cy="140" rx="5" ry="8" style={fill("monster-authority")} />
        <path d={GOWN_RIM} strokeWidth="2.5" strokeLinecap="round" style={stroke("moon", 0.8)} />
        <g data-part="body-detail">
          <path d={GOWN_TEARS} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={stroke("ground", 0.5)} />
          <path d="M62 150Q74 142 86 150M114 156Q126 148 138 156" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.4)} />
          <path d="M40 126Q46 132 52 128M148 128Q154 132 160 126" strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.4)} />
        </g>
      </g>
      <g data-part="face">
        <ellipse cx="100" cy="54" rx="21" ry="26" style={grad("skin")} />
        <path d="M112 30C124 40 124 66 108 78C118 66 120 46 112 30Z" style={fill("ground", 0.3)} />
        <path d="M80 40C78 52 82 66 90 74" strokeWidth="2" strokeLinecap="round" style={stroke("moon", 0.8)} />
        <ellipse cx="91" cy="50" rx="5.5" ry="8" style={fill("ground")} />
        <ellipse cx="109" cy="50" rx="5.5" ry="8" style={fill("ground")} />
        <circle cx="91" cy="54" r="4.5" style={grad("glint")} />
        <circle cx="109" cy="54" r="4.5" style={grad("glint")} />
        <circle cx="91" cy="55" r="1.2" style={fill("lantern")} />
        <circle cx="109" cy="55" r="1.2" style={fill("lantern")} />
        <ellipse cx="100" cy="70" rx="7" ry="11" style={fill("ground")} />
        <g data-part="face-detail">
          <path d="M82 38Q90 32 96 38M104 38Q110 32 118 38" strokeWidth="1.6" strokeLinecap="round" style={stroke("ground", 0.55)} />
          <path d="M93 62H107M95 78H105" strokeWidth="1" strokeLinecap="round" style={stroke("moon", 0.6)} />
          <path d="M88 62Q86 72 88 80M112 62Q114 72 112 80" strokeWidth="1" strokeLinecap="round" style={stroke("ground", 0.4)} />
          <path d="M91 60Q90 68 92 74M109 60Q110 68 108 74" strokeWidth="0.9" strokeLinecap="round" style={stroke("moon", 0.35)} />
        </g>
      </g>
      <g data-part="brooch">
        <path d="M100 88V94" strokeWidth="2" strokeLinecap="round" style={stroke("stone")} />
        <path d={BADGE} style={grad("badge")} />
        <path d={BADGE} strokeWidth="1.5" strokeLinejoin="round" style={stroke("ground", 0.7)} />
        <path d="M91 98L100 94.5" strokeWidth="1.4" strokeLinecap="round" style={stroke("moon", 0.8)} />
        <path d={STAR} style={fill("lantern")} />
        <g data-part="brooch-detail">
          <path d="M92 100V108C92 113 96 117 100 119.5" strokeWidth="0.9" strokeDasharray="2 2" style={stroke("moon", 0.5)} />
          <circle cx="92" cy="99" r="1" style={fill("moon", 0.8)} />
          <circle cx="108" cy="99" r="1" style={fill("moon", 0.8)} />
          <circle cx="100" cy="121" r="1" style={fill("ground", 0.7)} />
        </g>
      </g>
      <g data-part="mist-detail">
        <path d="M18 190Q60 180 100 192T182 188" strokeWidth="2" strokeLinecap="round" style={stroke("fog", 0.7)} />
      </g>
    </svg>
  );
}

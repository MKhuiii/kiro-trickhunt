import type { CSSProperties, ReactElement } from "react";

/**
 * The field-guide notebook (bestiary design): a closed, worn book with a cloth
 * spine, page edges, a ribbon bookmark, a strap with a clasp and a small lantern
 * mark on the cover. Decorative only: no text, no title, no filter, no animate.
 * Colors come only from the `--th-*` tokens. Fine details sit in `-detail`
 * groups (hidden in high contrast).
 */

export interface NotebookProps {
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

const grad = (id: string): CSSProperties => ({ fill: `url(#th-notebook-${id})` });

/** A small closed notebook, slightly tilted, with a ribbon hanging below. */
export function Notebook({ className }: NotebookProps): ReactElement {
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
        <linearGradient id="th-notebook-cover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("parchment-border")} />
          <stop offset="1" style={stop("ground")} />
        </linearGradient>
        <linearGradient id="th-notebook-pages" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={stop("parchment")} />
          <stop offset="1" style={stop("parchment-border")} />
        </linearGradient>
      </defs>
      <g data-part="shadow-detail">
        <ellipse cx="100" cy="182" rx="62" ry="7" style={fill("ground", 0.5)} />
      </g>
      <g data-part="book" transform="rotate(-5 100 100)">
        <g data-part="pages">
          <path d="M52 30H156Q162 30 162 36V158Q162 164 156 164H52Z" style={grad("pages")} />
          <g data-part="pages-detail">
            <path d="M150 38V156M154 36V158M158 34V160" strokeWidth="0.8" style={stroke("stone", 0.6)} />
          </g>
        </g>
        <g data-part="cover">
          <path d="M40 24H146Q152 24 152 30V152Q152 158 146 158H40Q34 158 34 152V30Q34 24 40 24Z" style={grad("cover")} />
          <path d="M34 30Q34 24 40 24H56V158H40Q34 158 34 152Z" style={fill("ground", 0.55)} />
          <path d="M40 24H146Q152 24 152 30V34H34V30Q34 24 40 24Z" style={fill("moon", 0.18)} />
          <g data-part="cover-detail">
            <path d="M62 36H144V146H62Z" strokeWidth="1.4" strokeDasharray="4 3" style={stroke("parchment-text", 0.55)} />
            <path d="M56 40V50M56 70V80M56 100V110M56 130V140" strokeWidth="2.4" strokeLinecap="round" style={stroke("lantern", 0.7)} />
            <path d="M70 142C84 148 110 148 136 142" strokeWidth="0.8" style={stroke("stone", 0.7)} />
            <path d="M40 40C38 70 40 110 42 146" strokeWidth="0.8" style={stroke("moon", 0.3)} />
            <path d="M66 40l6 0M134 40l-6 0M66 142l6 0M134 142l-6 0" strokeWidth="1" strokeLinecap="round" style={stroke("parchment-text", 0.6)} />
          </g>
        </g>
        <g data-part="emblem">
          <circle cx="103" cy="86" r="22" style={fill("ground", 0.8)} />
          <circle cx="103" cy="86" r="22" strokeWidth="2" style={stroke("parchment-text")} />
          <path d="M103 70C112 80 114 90 110 96C107 100 99 100 96 96C92 90 94 80 103 70Z" style={fill("lantern")} />
          <path d="M103 80C107 86 107 91 103 94C99 91 99 86 103 80Z" style={fill("moon", 0.85)} />
          <g data-part="emblem-detail">
            <circle cx="103" cy="86" r="26" strokeWidth="0.8" strokeDasharray="2 3" style={stroke("parchment-border", 0.7)} />
            <path d="M92 104H114" strokeWidth="1.6" strokeLinecap="round" style={stroke("parchment-text", 0.8)} />
          </g>
        </g>
        <g data-part="strap">
          <path d="M120 24H134V158H120Z" style={fill("ground", 0.85)} />
          <rect x="116" y="112" width="22" height="16" rx="2" strokeWidth="2.4" style={stroke("parchment-border")} />
          <circle cx="127" cy="120" r="2.2" style={fill("lantern")} />
          <g data-part="strap-detail">
            <path d="M123 28V154M131 28V154" strokeWidth="0.7" strokeDasharray="2 2" style={stroke("parchment-text", 0.5)} />
          </g>
        </g>
        <g data-part="ribbon">
          <path d="M82 158H92V184L87 178L82 184Z" style={fill("lantern", 0.9)} />
          <g data-part="ribbon-detail">
            <path d="M87 160V176" strokeWidth="0.7" style={stroke("moon", 0.5)} />
          </g>
        </g>
      </g>
    </svg>
  );
}

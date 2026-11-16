import type { ReactElement } from "react";

/**
 * Icons for the three round controls in the top-right corner: the language flag,
 * the speaker and the gear. Original drawings; the flags are simple national
 * flags. Decorative: every control has a text name from the dictionary.
 */

interface IconProps {
  readonly className?: string;
}

const COMMON = {
  "aria-hidden": true,
  focusable: false,
} as const;

/** English: simple Union flag (blue field, white and red crosses). Fills its round button. */
export function FlagEn({ className }: IconProps): ReactElement {
  return (
    <svg
      {...COMMON}
      viewBox="0 0 60 40"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      className={className}
    >
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0L60 40M60 0L0 40" stroke="#ffffff" strokeWidth="8" />
      <path d="M0 0L60 40M60 0L0 40" stroke="#c8102e" strokeWidth="3" />
      <path d="M30 0V40M0 20H60" stroke="#ffffff" strokeWidth="12" />
      <path d="M30 0V40M0 20H60" stroke="#c8102e" strokeWidth="7" />
    </svg>
  );
}

/** Vietnamese: red field with a yellow five-point star. */
export function FlagVi({ className }: IconProps): ReactElement {
  return (
    <svg
      {...COMMON}
      viewBox="0 0 60 40"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      className={className}
    >
      <rect width="60" height="40" fill="#da251d" />
      <polygon
        points="30,9 32.47,16.6 40.46,16.6 33.99,21.3 36.47,28.9 30,24.2 23.53,28.9 26.01,21.3 19.54,16.6 27.53,16.6"
        fill="#ffff00"
      />
    </svg>
  );
}

/** Speaker with sound waves: sound is on. */
export function IconSpeaker({ className }: IconProps): ReactElement {
  return (
    <svg
      {...COMMON}
      viewBox="0 0 24 24"
      width="1.5rem"
      height="1.5rem"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      <path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" />
    </svg>
  );
}

/** Speaker with a cross: sound is off. */
export function IconSpeakerOff({ className }: IconProps): ReactElement {
  return (
    <svg
      {...COMMON}
      viewBox="0 0 24 24"
      width="1.5rem"
      height="1.5rem"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" />
    </svg>
  );
}

const TEETH = [0, 45, 90, 135, 180, 225, 270, 315] as const;

/** A gear: a ring with eight teeth. */
export function IconGear({ className }: IconProps): ReactElement {
  return (
    <svg
      {...COMMON}
      viewBox="0 0 24 24"
      width="1.5rem"
      height="1.5rem"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      {TEETH.map((angle) => (
        <path key={angle} d="M12 2.6v3" transform={`rotate(${angle} 12 12)`} />
      ))}
    </svg>
  );
}

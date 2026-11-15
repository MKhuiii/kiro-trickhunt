// Shared class strings. Colors only through the --th-* custom properties.

export const FOCUS_RING =
  "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--th-focus)]";

export const BUTTON_PRIMARY = `rounded-xl bg-[var(--th-accent)] px-6 py-3 text-lg font-bold text-[color:var(--th-on-accent)] disabled:opacity-60 ${FOCUS_RING}`;

export const BUTTON_SECONDARY = `rounded-xl border-2 border-[var(--th-border)] bg-[var(--th-surface)] px-4 py-2 text-base font-semibold text-[color:var(--th-text)] ${FOCUS_RING}`;

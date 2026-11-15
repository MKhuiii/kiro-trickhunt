import type { ReactElement } from "react";

/** Original, simple monster shapes. Decorative only; the name is rendered as text elsewhere. */

interface ArtProps {
  readonly className?: string;
}

function Frame({
  className,
  children,
}: ArtProps & { readonly children: ReactElement | readonly ReactElement[] }): ReactElement {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 64 64"
      width="100%"
      height="100%"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Ghost with a wavy hem. */
export function MonsterBankGhost({ className }: ArtProps): ReactElement {
  return (
    <Frame className={className}>
      <path d="M12 56V30C12 16 20 8 32 8s20 8 20 22v26l-6.5-5-6.5 5-6.5-5-6.5 5-6.5-5-6 5z" />
      <circle cx="24" cy="29" r="3.5" fill="currentColor" />
      <circle cx="40" cy="29" r="3.5" fill="currentColor" />
      <path d="M27 40q5 4 10 0" />
    </Frame>
  );
}

/** Vampire with a high collar and fangs. */
export function MonsterPrizeVampire({ className }: ArtProps): ReactElement {
  return (
    <Frame className={className}>
      <path d="M32 54C20 54 14 44 14 32c0-8 4-14 10-17l8 8 8-8c6 3 10 9 10 17 0 12-6 22-18 22z" />
      <path d="M8 58l8-14M56 58l-8-14" />
      <circle cx="25" cy="32" r="3" fill="currentColor" />
      <circle cx="39" cy="32" r="3" fill="currentColor" />
      <path d="M25 43h14M28 43l2 6 2-6M32 43l2 6 2-6" />
    </Frame>
  );
}

/** Zombie with stitched head and uneven eyes. */
export function MonsterJobZombie({ className }: ArtProps): ReactElement {
  return (
    <Frame className={className}>
      <rect x="14" y="10" width="36" height="42" rx="8" />
      <path d="M14 20h36M26 10v10M38 10v10" />
      <circle cx="25" cy="32" r="4" />
      <circle cx="39" cy="33" r="2.5" fill="currentColor" />
      <path d="M24 44h16M28 41v6M34 41v6M40 41v6" />
      <path d="M22 52v6M42 52v6" />
    </Frame>
  );
}

/** Banshee with flowing hair and an open mouth. */
export function MonsterAuthorityBanshee({ className }: ArtProps): ReactElement {
  return (
    <Frame className={className}>
      <path d="M32 8c-9 0-15 7-15 16v8c0 6-4 10-7 14 6 0 9-1 11-4 1 6-1 12-5 18 8-2 12-6 14-12 2 6 6 10 14 12-4-6-6-12-5-18 2 3 5 4 11 4-3-4-7-8-7-14v-8c0-9-6-16-15-16z" />
      <circle cx="26" cy="26" r="3" fill="currentColor" />
      <circle cx="38" cy="26" r="3" fill="currentColor" />
      <ellipse cx="32" cy="38" rx="4" ry="6" />
    </Frame>
  );
}

/** Shade: a hooded shape with an empty face and two glints. */
export function MonsterGenericShade({ className }: ArtProps): ReactElement {
  return (
    <Frame className={className}>
      <path d="M32 6C20 6 12 16 12 28c0 10 3 18 0 30h40c-3-12 0-20 0-30C52 16 44 6 32 6z" />
      <path d="M22 28c0-6 4-10 10-10s10 4 10 10-4 12-10 12-10-6-10-12z" />
      <circle cx="28" cy="29" r="2" fill="currentColor" />
      <circle cx="36" cy="29" r="2" fill="currentColor" />
    </Frame>
  );
}

/** Calm candle for the neutral state. */
export function MonsterNeutralCandle({ className }: ArtProps): ReactElement {
  return (
    <Frame className={className}>
      <path d="M32 4c5 6 5 10 0 14-5-4-5-8 0-14z" fill="currentColor" />
      <rect x="22" y="24" width="20" height="30" rx="3" />
      <path d="M32 18v6M14 58h36M27 34q5 4 10 0" />
    </Frame>
  );
}

const ART: Readonly<Record<string, (props: ArtProps) => ReactElement>> = {
  "monster-bank-ghost": MonsterBankGhost,
  "monster-prize-vampire": MonsterPrizeVampire,
  "monster-job-zombie": MonsterJobZombie,
  "monster-authority-banshee": MonsterAuthorityBanshee,
  "monster-generic-shade": MonsterGenericShade,
  "monster-neutral-candle": MonsterNeutralCandle,
};

/** Renders the art for a `MONSTER_PRESENTATION` `artKey`. Unknown keys fall back to the shade. */
export function MonsterArt({
  artKey,
  className,
}: {
  readonly artKey: string;
  readonly className?: string;
}): ReactElement {
  const Art = ART[artKey] ?? MonsterGenericShade;
  return <Art className={className} />;
}

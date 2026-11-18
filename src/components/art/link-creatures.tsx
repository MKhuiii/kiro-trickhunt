import type { ReactElement, ReactNode } from "react";
import { IconLink } from "../icons";

/**
 * Original link creature art. Decorative, no words. Every piece is at most 12
 * elements in a 48x48 box and uses `currentColor` only; the badge sets the color.
 */

interface ArtProps {
  readonly className?: string;
}

function Art({ className, children }: ArtProps & { readonly children: ReactNode }): ReactElement {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 48 48"
      width="1em"
      height="1em"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Two outlines side by side, the right one mirrored, joined by a dotted centre line. */
function Doppelganger({ className }: ArtProps): ReactElement {
  return (
    <Art className={className}>
      <circle cx="14" cy="14" r="6" />
      <path d="M5 40V30a9 9 0 0 1 18 0v10z" />
      <circle cx="34" cy="14" r="6" />
      <path d="M43 40V30a9 9 0 0 0-18 0v10z" />
      <path d="M24 6v2M24 14v2M24 22v2M24 30v2M24 38v2" />
    </Art>
  );
}

/** A circle split in two halves with swap arrows on its edge. */
function Changeling({ className }: ArtProps): ReactElement {
  return (
    <Art className={className}>
      <circle cx="24" cy="24" r="14" />
      <path d="M24 10v28" />
      <path d="M24 24a14 14 0 0 1 0 14a14 14 0 0 1 0-28z" fill="currentColor" />
      <path d="M8 8h8M12 4l-4 4 4 4" />
      <path d="M40 40h-8M36 36l4 4-4 4" />
    </Art>
  );
}

/** A hooded triangle with an empty oval where the face would be. */
function FacelessOne({ className }: ArtProps): ReactElement {
  return (
    <Art className={className}>
      <path d="M24 4L6 42h36L24 4z" />
      <ellipse cx="24" cy="26" rx="5" ry="7" />
      <path d="M14 42c2-5 5-8 10-8s8 3 10 8" />
    </Art>
  );
}

/** An oval face with a wide band across it and two eye holes. */
function MaskedStranger({ className }: ArtProps): ReactElement {
  return (
    <Art className={className}>
      <ellipse cx="24" cy="24" rx="14" ry="19" />
      <path d="M10 18h28v10H10z" />
      <circle cx="18" cy="23" r="2.5" fill="currentColor" />
      <circle cx="30" cy="23" r="2.5" fill="currentColor" />
      <path d="M20 38h8" />
    </Art>
  );
}

/** Three small circles on curved necks that meet at one base. */
function Hydra({ className }: ArtProps): ReactElement {
  return (
    <Art className={className}>
      <circle cx="9" cy="10" r="4" />
      <circle cx="24" cy="8" r="4" />
      <circle cx="39" cy="10" r="4" />
      <path d="M9 14c0 12 8 12 15 22" />
      <path d="M24 12v24" />
      <path d="M39 14c0 12-8 12-15 22" />
      <path d="M12 44c4-8 20-8 24 0z" />
    </Art>
  );
}

/** An arch (gate) with a draped triangle over its top. */
function CloakedGate({ className }: ArtProps): ReactElement {
  return (
    <Art className={className}>
      <path d="M8 44V22a16 16 0 0 1 32 0v22" />
      <path d="M16 44V24a8 8 0 0 1 16 0v20" />
      <path d="M24 4L10 20h28L24 4z" fill="currentColor" />
      <path d="M4 44h40" />
    </Art>
  );
}

/** A teardrop flame with two small dots beside it. */
function Wisp({ className }: ArtProps): ReactElement {
  return (
    <Art className={className}>
      <path d="M24 4c8 9 12 15 12 22a12 12 0 0 1-24 0c0-7 4-13 12-22z" />
      <path d="M24 24c3 3 4 5 4 8a4 4 0 0 1-8 0c0-3 1-5 4-8z" fill="currentColor" />
      <circle cx="6" cy="30" r="2" fill="currentColor" />
      <circle cx="43" cy="38" r="2" fill="currentColor" />
    </Art>
  );
}

/** A round seal with a cross-shaped mark cut through it and three small spots around it. */
function PlagueMark({ className }: ArtProps): ReactElement {
  return (
    <Art className={className}>
      <circle cx="24" cy="24" r="18" />
      <circle cx="24" cy="24" r="12" />
      <path d="M17 17l14 14M31 17L17 31" />
      <circle cx="24" cy="24" r="3" fill="currentColor" />
      <circle cx="24" cy="5" r="2" fill="currentColor" />
      <circle cx="6" cy="36" r="2" fill="currentColor" />
      <circle cx="42" cy="36" r="2" fill="currentColor" />
    </Art>
  );
}

/** Registry: `artKey` of `LINK_CREATURES` to its drawing. */
export const LINK_ART: Readonly<Record<string, (props: ArtProps) => ReactElement>> = {
  "creature-doppelganger": Doppelganger,
  "creature-changeling": Changeling,
  "creature-faceless-one": FacelessOne,
  "creature-masked-stranger": MaskedStranger,
  "creature-hydra": Hydra,
  "creature-cloaked-gate": CloakedGate,
  "creature-wisp": Wisp,
  "creature-plague-mark": PlagueMark,
};

/** Renders the art for `artKey`. Any unregistered key shows the generic link icon. Never throws. */
export function LinkCreatureArt({
  artKey,
  className,
}: {
  readonly artKey: unknown;
  readonly className?: string;
}): ReactElement {
  const Piece =
    typeof artKey === "string" && Object.hasOwn(LINK_ART, artKey) ? LINK_ART[artKey] : null;
  return Piece === null ? <IconLink className={className} /> : <Piece className={className} />;
}

import type { ReactElement } from "react";
import { BackdropForest, BackdropHome } from "./backdrops";
import { BackdropMountain, BackdropSwamp } from "./backdrops-journey";
import { BackdropRuins } from "./backdrops-ruins";
import { Bag } from "./bag";
import { Hunter } from "./hunter";
import { MonsterBankGhost, MonsterJobZombie, MonsterPrizeVampire } from "./monsters";
import { MonsterAuthorityBanshee } from "./monsters-authority";
import { MonsterGenericShade, MonsterNeutralCandle } from "./monsters-generic";
import { MonsterInvestmentGoblin, MonsterRomanceWraith } from "./monsters-new";
import { Notebook } from "./notebook";
import { Shade } from "./shade";

/**
 * Art registry (hunter-ui design B2). Every piece of art is reached through `Art`.
 * The pieces here are simple placeholders; swapping one for a detailed SVG or an
 * original image (`{ kind: "image", src: "/hunter/..." }`) changes one registry line.
 * Decorative only: no text, no title, no filter, no animate.
 */

export type ArtId =
  | "backdrop-home"
  | "backdrop-forest"
  | "backdrop-mountain"
  | "backdrop-swamp"
  | "backdrop-ruins"
  | "hunter"
  | "bag"
  | "shade"
  | "notebook"
  | "monster-bank-ghost"
  | "monster-prize-vampire"
  | "monster-job-zombie"
  | "monster-authority-banshee"
  | "monster-generic-shade"
  | "monster-neutral-candle"
  | "monster-investment-goblin"
  | "monster-romance-wraith";

export interface ArtProps {
  readonly pose?: string;
  readonly className?: string;
}

type SvgComponent = (props: ArtProps) => ReactElement;

export type ArtEntry =
  | { readonly kind: "svg"; readonly Component: SvgComponent }
  | { readonly kind: "image"; readonly src: string }; // same-origin file under public/hunter/

const FALLBACK_ID: ArtId = "monster-generic-shade";

export {
  MonsterAuthorityBanshee,
  MonsterBankGhost,
  MonsterGenericShade,
  MonsterInvestmentGoblin,
  MonsterJobZombie,
  MonsterNeutralCandle,
  MonsterPrizeVampire,
  MonsterRomanceWraith,
};

/* ---------- Registry ---------- */

export const ART_REGISTRY: Readonly<Record<ArtId, ArtEntry>> = {
  "backdrop-home": { kind: "svg", Component: BackdropHome },
  "backdrop-forest": { kind: "svg", Component: BackdropForest },
  "backdrop-mountain": { kind: "svg", Component: BackdropMountain },
  "backdrop-swamp": { kind: "svg", Component: BackdropSwamp },
  "backdrop-ruins": { kind: "svg", Component: BackdropRuins },
  hunter: { kind: "svg", Component: Hunter },
  bag: { kind: "svg", Component: Bag },
  shade: { kind: "svg", Component: Shade },
  notebook: { kind: "svg", Component: Notebook },
  "monster-bank-ghost": { kind: "svg", Component: MonsterBankGhost },
  "monster-prize-vampire": { kind: "svg", Component: MonsterPrizeVampire },
  "monster-job-zombie": { kind: "svg", Component: MonsterJobZombie },
  "monster-authority-banshee": { kind: "svg", Component: MonsterAuthorityBanshee },
  "monster-generic-shade": { kind: "svg", Component: MonsterGenericShade },
  "monster-neutral-candle": { kind: "svg", Component: MonsterNeutralCandle },
  "monster-investment-goblin": { kind: "svg", Component: MonsterInvestmentGoblin },
  "monster-romance-wraith": { kind: "svg", Component: MonsterRomanceWraith },
};

function lookup(id: string): ArtEntry {
  return Object.prototype.hasOwnProperty.call(ART_REGISTRY, id)
    ? ART_REGISTRY[id as ArtId]
    : ART_REGISTRY[FALLBACK_ID];
}

/** Renders a registered piece. An unknown id falls back to the generic shade. */
export function Art({
  id,
  pose,
  className,
}: {
  readonly id: ArtId | (string & {});
  readonly pose?: string;
  readonly className?: string;
}): ReactElement {
  const entry = lookup(id);
  if (entry.kind === "image") {
    return <img src={entry.src} alt="" aria-hidden="true" className={className} />;
  }
  const { Component } = entry;
  return <Component pose={pose} className={className} />;
}

import type { MessageKey } from "./i18n/en";
import type { ColorToken } from "./theme/palettes";

/** How firm the wording for a creature is. */
export type LinkTone = "strong" | "medium" | "soft";

export type LinkCreatureId =
  | "doppelganger"
  | "changeling"
  | "faceless-one"
  | "masked-stranger"
  | "hydra"
  | "cloaked-gate"
  | "wisp"
  | "plague-mark";

export interface LinkCreature {
  readonly id: LinkCreatureId;
  /** A url.* signal id. */
  readonly signalId: string;
  readonly nameKey: MessageKey;
  readonly colorToken: ColorToken;
  readonly artKey: string;
  readonly tone: LinkTone;
  /** Overrides the tone explanation line when present. */
  readonly explanationKey?: MessageKey;
}

/** One creature per url.* signal the URL analyzer can emit. */
export const LINK_CREATURES: readonly LinkCreature[] = [
  {
    id: "doppelganger",
    signalId: "url.brand-lookalike",
    nameKey: "link.doppelganger.name",
    colorToken: "link-doppelganger",
    artKey: "creature-doppelganger",
    tone: "strong",
  },
  {
    id: "changeling",
    signalId: "url.punycode-host",
    nameKey: "link.changeling.name",
    colorToken: "link-changeling",
    artKey: "creature-changeling",
    tone: "strong",
  },
  {
    id: "faceless-one",
    signalId: "url.ip-address-host",
    nameKey: "link.faceless-one.name",
    colorToken: "link-faceless-one",
    artKey: "creature-faceless-one",
    tone: "strong",
  },
  {
    id: "masked-stranger",
    signalId: "url.at-in-authority",
    nameKey: "link.masked-stranger.name",
    colorToken: "link-masked-stranger",
    artKey: "creature-masked-stranger",
    tone: "strong",
  },
  {
    id: "hydra",
    signalId: "url.excessive-subdomains",
    nameKey: "link.hydra.name",
    colorToken: "link-hydra",
    artKey: "creature-hydra",
    tone: "medium",
  },
  {
    id: "cloaked-gate",
    signalId: "url.known-shortener",
    nameKey: "link.cloaked-gate.name",
    colorToken: "link-cloaked-gate",
    artKey: "creature-cloaked-gate",
    tone: "soft",
  },
  {
    id: "wisp",
    signalId: "url.credential-keywords",
    nameKey: "link.wisp.name",
    colorToken: "link-wisp",
    artKey: "creature-wisp",
    tone: "soft",
  },
  {
    id: "plague-mark",
    signalId: "url.reputation-listed",
    nameKey: "link.plague-mark.name",
    colorToken: "link-plague-mark",
    artKey: "creature-plague-mark",
    tone: "strong",
    explanationKey: "link.plague-mark.explain",
  },
];

/** Label, icon and explanation line for each tone band. */
export const LINK_TONES: Readonly<
  Record<
    LinkTone,
    {
      readonly labelKey: MessageKey;
      readonly iconKey: string;
      readonly explanationKey: MessageKey;
    }
  >
> = {
  strong: {
    labelKey: "link.tone.strong.label",
    iconKey: "icon-tone-strong",
    explanationKey: "link.tone.strong.explain",
  },
  medium: {
    labelKey: "link.tone.medium.label",
    iconKey: "icon-tone-medium",
    explanationKey: "link.tone.medium.explain",
  },
  soft: {
    labelKey: "link.tone.soft.label",
    iconKey: "icon-tone-soft",
    explanationKey: "link.tone.soft.explain",
  },
};

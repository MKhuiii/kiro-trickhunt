import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { LinkCreatureView } from "../ui";
import { LinkCreatureArt } from "./art/link-creatures";
import { ToneIcon } from "./icons";

interface LinkBadgeProps {
  readonly creature: LinkCreatureView;
  readonly locale: Locale;
}

/** Plain, non-clickable badge for a link creature on a url signal card. */
export function LinkBadge({ creature, locale }: LinkBadgeProps): ReactElement {
  const color = `var(--th-${creature.colorToken})`;
  return (
    <div className="mt-3 flex gap-3 rounded-xl border border-[var(--th-border)] bg-[var(--th-raised)] p-3">
      <div className="shrink-0" style={{ color }}>
        <LinkCreatureArt artKey={creature.artKey} className="h-12 w-12" />
      </div>
      <div className="min-w-0">
        <p className="text-base text-[color:var(--th-muted)]">{t(locale, "link.badge.caption")}</p>
        <p className="text-lg font-bold" style={{ color }}>
          {t(locale, creature.nameKey)}
        </p>
        <p className="mt-1 text-base text-[color:var(--th-text)]">
          {t(locale, creature.descriptionKey)}
        </p>
        <p className="mt-2 flex items-center gap-2 text-base font-semibold text-[color:var(--th-text)]">
          <span style={{ color }} className="text-xl">
            <ToneIcon iconKey={creature.toneIconKey} />
          </span>
          <span>{t(locale, creature.toneLabelKey)}</span>
        </p>
        <p className="mt-1 text-base text-[color:var(--th-text)]">
          {t(locale, creature.explanationKey)}
        </p>
        <p className="mt-2 text-base">
          <span className="font-semibold">{t(locale, "result.evidence.label")}</span>{" "}
          <span className="break-words">{creature.evidence}</span>
        </p>
      </div>
    </div>
  );
}

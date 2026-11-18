import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { LinkCreatureView } from "../ui";
import type { ReputationNoteView } from "../ui";
import { LinkBadge } from "./LinkBadge";
import { ReputationAttribution } from "./ReputationAttribution";
import { ReputationNote } from "./ReputationNote";

interface LinkSpotlightProps {
  readonly creatures: readonly LinkCreatureView[];
  readonly locale: Locale;
  /** Neutral note about the link lookup, shown after the badges. */
  readonly note?: ReputationNoteView | null;
}

/** One section listing the link creatures found in the message. Plain text, no links. */
export function LinkSpotlight({ creatures, locale, note = null }: LinkSpotlightProps): ReactElement | null {
  if (creatures.length === 0) return null;
  return (
    <section aria-labelledby="link-spotlight-heading" className="text-[color:var(--th-text)]">
      <h3 id="link-spotlight-heading" className="text-2xl font-bold">
        {t(locale, "result.links.heading")}
      </h3>
      <ul className="mt-3 space-y-3">
        {creatures.map((c) => (
          <li key={c.id}>
            <LinkBadge creature={c} locale={locale} />
            <ReputationAttribution listed={c.id === "plague-mark"} locale={locale} />
          </li>
        ))}
      </ul>
      {note !== null ? (
        <div className="mt-3">
          <ReputationNote note={note} locale={locale} />
        </div>
      ) : null}
    </section>
  );
}

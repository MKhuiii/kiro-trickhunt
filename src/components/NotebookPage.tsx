import type { ReactElement, Ref } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { BestiaryEntry } from "../ui";
import { LINK_CREATURE_COLOR, LINK_CREATURE_DISC, LinkCreatureArt } from "./art/link-creatures";
import { Art } from "./art/registry";
import { FOCUS_RING } from "./styles";

interface NotebookPageProps {
  readonly locale: Locale;
  readonly entry: BestiaryEntry;
  readonly isLast: boolean;
  readonly headingRef?: Ref<HTMLHeadingElement>;
}

const TEXT = "text-[color:var(--th-text)]";
const ART_SIZE = "h-24 w-24 max-w-full";

/** One entry page. The closing note shows only when `isLast` is true. */
export function NotebookPage({ locale, entry, isLast, headingRef }: NotebookPageProps): ReactElement {
  const art =
    entry.kind === "link" ? (
      <span className={`max-w-full shrink-0 ${LINK_CREATURE_DISC}`} style={{ color: LINK_CREATURE_COLOR }} aria-hidden="true">
        <LinkCreatureArt artKey={entry.artKey} className={ART_SIZE} />
      </span>
    ) : (
      <span className="max-w-full shrink-0" aria-hidden="true">
        <Art id={entry.artKey} className={ART_SIZE} />
      </span>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {art}
        <div className="flex min-w-0 flex-col">
          <h3 ref={headingRef} tabIndex={-1} className={`th-hand text-2xl font-bold ${TEXT} ${FOCUS_RING}`}>
            {t(locale, entry.nameKey)}
          </h3>
          <p className={`text-base ${TEXT}`}>
            {t(locale, entry.kind === "link" ? "bestiary.kind.link" : "bestiary.kind.monster")}
          </p>
        </div>
      </div>
      <p className={`text-lg ${TEXT}`}>{t(locale, entry.descKey)}</p>
      {entry.kind === "link" && entry.toneLabelKey && entry.toneExplainKey ? (
        <div className="flex flex-col gap-1">
          <p className={`text-base font-bold ${TEXT}`}>{t(locale, entry.toneLabelKey)}</p>
          <p className={`text-base ${TEXT}`}>{t(locale, entry.toneExplainKey)}</p>
        </div>
      ) : null}
      <section className="flex flex-col gap-2">
        <h4 className={`text-xl font-bold ${TEXT}`}>{t(locale, "bestiary.signs.heading")}</h4>
        <ul className={`list-disc space-y-1 pl-6 text-base ${TEXT}`}>
          {entry.tipKeys.map((k) => (
            <li key={k}>{t(locale, k)}</li>
          ))}
        </ul>
      </section>
      {entry.kind === "link" ? <p className={`text-base ${TEXT}`}>{t(locale, "link.plain.note")}</p> : null}
      {isLast ? <p className={`text-base font-bold ${TEXT}`}>{t(locale, "bestiary.note")}</p> : null}
    </div>
  );
}

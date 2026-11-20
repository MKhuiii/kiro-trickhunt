import type { ReactElement, Ref } from "react";
import type { Locale } from "../pipeline";
import { BESTIARY_ENTRIES, groupEntries, t } from "../ui";
import type { BestiaryEntry } from "../ui";
import { LINK_CREATURE_COLOR, LINK_CREATURE_DISC, LinkCreatureArt } from "./art/link-creatures";
import { Art } from "./art/registry";
import { FOCUS_RING } from "./styles";

interface NotebookContentsProps {
  readonly locale: Locale;
  readonly onGoTo: (page: number) => void;
  readonly headingRef?: Ref<HTMLHeadingElement>;
}

const TEXT = "text-[color:var(--th-text)]";
const ART_SIZE = "block h-auto w-full";

/** Page 0: one picture sticker per entry. Entry n of the table is on page index n. */
export function NotebookContents({ locale, onGoTo, headingRef }: NotebookContentsProps): ReactElement {
  const groups = groupEntries(BESTIARY_ENTRIES);

  const sticker = (entry: BestiaryEntry): ReactElement => {
    const page = BESTIARY_ENTRIES.indexOf(entry) + 1;
    const art =
      entry.kind === "link" ? (
        <span className={`w-16 max-w-full shrink-0 ${LINK_CREATURE_DISC}`} style={{ color: LINK_CREATURE_COLOR }} aria-hidden="true">
          <LinkCreatureArt artKey={entry.artKey} className={ART_SIZE} />
        </span>
      ) : (
        <span className="block w-16 max-w-full shrink-0" aria-hidden="true">
          <Art id={entry.artKey} className={ART_SIZE} />
        </span>
      );
    return (
      <li key={entry.id} className="min-w-0 basis-[calc(50%-0.5rem)] min-[24rem]:basis-[calc(33.333%-0.75rem)]">
        <button
          type="button"
          onClick={() => onGoTo(page)}
          className={`th-sticker flex min-h-11 min-w-0 w-full flex-col items-center gap-1 p-2 text-center ${TEXT} ${FOCUS_RING}`}
        >
          {art}
          <span className="text-base font-bold [overflow-wrap:anywhere]">{t(locale, entry.nameKey)}</span>
          <span className="sr-only">
            {t(locale, entry.kind === "link" ? "bestiary.kind.link" : "bestiary.kind.monster")}
            {", "}
            {t(locale, "bestiary.toc.page", { page: page + 1 })}
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 ref={headingRef} tabIndex={-1} className={`th-hand text-2xl font-bold ${TEXT} ${FOCUS_RING}`}>
        {t(locale, "bestiary.toc.heading")}
      </h3>
      <p className={`text-base ${TEXT}`}>{t(locale, "bestiary.toc.intro")}</p>
      <h4 className={`th-hand text-xl font-bold ${TEXT}`}>{t(locale, "bestiary.group.monsters")}</h4>
      <ol className="th-sticker-board flex flex-wrap gap-4">{groups.monsters.map(sticker)}</ol>
      <h4 className={`th-hand text-xl font-bold ${TEXT}`}>{t(locale, "bestiary.group.links")}</h4>
      <ol className="th-sticker-board flex flex-wrap gap-4">{groups.links.map(sticker)}</ol>
    </div>
  );
}

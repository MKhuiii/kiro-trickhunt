import type { CSSProperties, ReactElement, Ref } from "react";
import type { Locale } from "../pipeline";
import { firstSentence, t } from "../ui";
import type { JournalReady } from "../ui";
import { LevelIcon } from "./icons";

interface JournalPageOneProps {
  readonly journal: JournalReady;
  readonly locale: Locale;
  /** Focus target after a result is ready. */
  readonly headingRef?: Ref<HTMLHeadingElement>;
}

function step(n: number): CSSProperties {
  return { "--i": n } as CSSProperties;
}

/**
 * Page 1 of the journal: the hunter's short note. Plain ink on paper, no cards.
 * It holds the monster, the level, what to do, up to three clues, one note line.
 */
export function JournalPageOne({ journal, locale, headingRef }: JournalPageOneProps): ReactElement {
  const p = journal.page1;
  let n = 0;
  return (
    <div className="th-write flex min-h-0 flex-1 flex-col gap-3 md:gap-4">
      <h2
        id="journal-heading-1"
        ref={headingRef}
        tabIndex={-1}
        style={step(n++)}
        className="th-hand sr-only text-2xl text-[color:var(--th-ink-faded)] md:not-sr-only"
      >
        {t(locale, "journal.title")}
      </h2>

      <div style={step(n++)}>
        <p className="th-hand text-3xl leading-tight text-[color:var(--th-ink)] md:text-4xl">
          {t(locale, p.monsterNameKey)}
        </p>
        <p className="mt-1 text-base text-[color:var(--th-ink)] md:text-lg">{t(locale, p.monsterShortKey)}</p>
      </div>

      <div style={step(n++)}>
        <p className="flex items-center gap-2 text-xl font-bold text-[color:var(--th-ink)] md:text-2xl">
          <span className="text-3xl text-[color:var(--th-blood)]">
            <LevelIcon iconKey={p.iconKey} />
          </span>
          <span>{t(locale, p.levelKey)}</span>
        </p>
        <p className="mt-1 text-base text-[color:var(--th-ink-faded)]">
          {t(locale, "result.meter.label", { percent: p.percent })}
        </p>
        <div className="relative mt-1" aria-hidden="true">
          <div className="th-meter-track w-full" />
          <div className="th-meter-fill absolute left-0 top-0" style={{ width: `${p.percent}%` }} />
        </div>
      </div>

      {p.actions.length > 0 ? (
        <div style={step(n++)}>
          <h3 className="th-hand text-2xl text-[color:var(--th-ink)]">
            {t(locale, "journal.do.heading")}
          </h3>
          <ol className="mt-1 list-decimal space-y-1 pl-6 text-lg text-[color:var(--th-ink)]">
            {p.actions.map((action, i) => (
              <li key={i} className={i === 0 ? "font-bold" : undefined}>
                {action}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {p.noSignals !== null ? (
        <div style={step(n++)} className="space-y-2 text-lg text-[color:var(--th-ink)]">
          <p className="font-bold">{t(locale, p.noSignals.summaryKey)}</p>
          <p>{t(locale, p.noSignals.reminderKey)}</p>
        </div>
      ) : (
        <div style={step(n++)}>
          <h3 className="th-hand text-2xl text-[color:var(--th-ink)]">
            {t(locale, "journal.clues.heading")}
          </h3>
          <ul className="mt-1 space-y-3 text-base text-[color:var(--th-ink)]">
            {p.clues.map((clue, i) => (
              <li key={`${i}-${clue.evidence}`}>
                <span className="block break-words text-lg font-bold">{`\u201C${clue.evidence}\u201D`}</span>
                <span className="block">{firstSentence(t(locale, clue.explanationKey))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.note !== null ? (
        <div style={step(n++)} className="text-base font-semibold text-[color:var(--th-blood)]">
          <p>{t(locale, p.note.key, p.note.params)}</p>
          {p.moreNotes > 0 ? (
            <p className="mt-1 font-normal text-[color:var(--th-ink-faded)]">
              {t(locale, "journal.moreNotes", { count: p.moreNotes })}
            </p>
          ) : null}
        </div>
      ) : p.moreNotes > 0 ? (
        <p style={step(n++)} className="text-base text-[color:var(--th-ink-faded)]">
          {t(locale, "journal.moreNotes", { count: p.moreNotes })}
        </p>
      ) : null}
    </div>
  );
}

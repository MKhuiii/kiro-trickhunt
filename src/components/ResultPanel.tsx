import type { ReactElement, Ref } from "react";
import type { Locale } from "../pipeline";
import { resultSections, t } from "../ui";
import type { ResultView, SectionId } from "../ui";
import { ActionBox } from "./ActionBox";
import { AiNote } from "./AiNote";
import { EvidenceList } from "./EvidenceList";
import { LevelBanner } from "./LevelBanner";
import { LimitsNote } from "./LimitsNote";
import { LinkSpotlight } from "./LinkSpotlight";
import { MonsterCard } from "./MonsterCard";
import { Notices } from "./Notices";
import { ReputationNote } from "./ReputationNote";
import { TechnicalDetails } from "./TechnicalDetails";
import { FOCUS_RING } from "./styles";

interface ResultPanelProps {
  readonly view: ResultView;
  readonly locale: Locale;
  /** Focus target after a result is ready. */
  readonly headingRef?: Ref<HTMLHeadingElement>;
}

export function renderSection(
  id: SectionId,
  view: ResultView,
  locale: Locale,
  headingRef: Ref<HTMLHeadingElement> | undefined,
): ReactElement | null {
  if (id === "heading") {
    return (
      <h2
        ref={headingRef}
        tabIndex={-1}
        className={`rounded-xl text-3xl font-bold text-[color:var(--th-text)] ${FOCUS_RING}`}
      >
        {t(locale, "result.heading")}
      </h2>
    );
  }
  if (id === "limitsNote") {
    return <LimitsNote messageKey={view.limitsNoteKey} locale={locale} />;
  }
  if (id === "notices") return <Notices notices={view.notices} locale={locale} />;
  if (id === "technical") {
    // Nothing to show for a withheld view: skip the node so no empty wrapper is made.
    return view.kind === "ready" ? <TechnicalDetails view={view} locale={locale} /> : null;
  }

  if (view.kind === "withheld") return null;
  switch (id) {
    case "levelBanner":
      return <LevelBanner view={view} locale={locale} />;
    case "linkSpotlight":
      return (
        <LinkSpotlight creatures={view.linkCreatures} locale={locale} note={view.reputationNote} />
      );
    case "reputationNote":
      return view.reputationNote === null ? null : (
        <ReputationNote note={view.reputationNote} locale={locale} />
      );
    case "aiNote":
      return view.aiNote === null ? null : <AiNote aiNote={view.aiNote} locale={locale} />;
    case "actions":
      return <ActionBox actions={view.actions} locale={locale} />;
    case "evidence":
      return <EvidenceList view={view} locale={locale} />;
    case "limitations":
      return (
        <section className="text-[color:var(--th-text)]">
          <h3 className="text-lg font-bold">{t(locale, "result.limitations.heading")}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-base">
            {view.limitations.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </section>
      );
    case "monster":
      return <MonsterCard monster={view.monster} locale={locale} />;
    default:
      return null;
  }
}

export function ResultPanel({ view, locale, headingRef }: ResultPanelProps): ReactElement {
  const sections = resultSections(view);
  return (
    <div className="space-y-6">
      {sections.map((id) => {
        const node = renderSection(id, view, locale, headingRef);
        return node === null ? null : <div key={id}>{node}</div>;
      })}
    </div>
  );
}

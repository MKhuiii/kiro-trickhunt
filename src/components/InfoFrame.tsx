import type { ReactElement, ReactNode, Ref } from "react";
import type { Locale } from "../pipeline";
import { resultSections, splitSections, t } from "../ui";
import type { ResultView, SectionId } from "../ui";
import { renderSection } from "./ResultPanel";
import { FOCUS_RING } from "./styles";

interface InfoFrameProps {
  readonly view: ResultView;
  readonly locale: Locale;
  /** Focus target after a result is ready. */
  readonly headingRef?: Ref<HTMLHeadingElement>;
  /** Extra content at the end of the scroll region (status, "Hunt again"). */
  readonly children?: ReactNode;
}

function renderList(
  ids: readonly SectionId[],
  view: ResultView,
  locale: Locale,
  headingRef: Ref<HTMLHeadingElement> | undefined,
): ReactElement[] {
  const out: ReactElement[] = [];
  for (const id of ids) {
    const node = renderSection(id, view, locale, headingRef);
    if (node !== null) out.push(<div key={id}>{node}</div>);
  }
  return out;
}

/** Result sections in a scroll region, with the limits note pinned below it. */
export function InfoFrame({ view, locale, headingRef, children }: InfoFrameProps): ReactElement {
  const { scrolling, pinned } = splitSections(resultSections(view));
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 py-4">
      <div
        role="region"
        tabIndex={0}
        aria-label={t(locale, "result.frame.label")}
        className={`min-h-0 flex-1 space-y-6 overflow-y-auto rounded-xl ${FOCUS_RING}`}
      >
        {renderList(scrolling, view, locale, headingRef)}
        {children}
      </div>
      {pinned.length > 0 ? (
        <div className="shrink-0">{renderList(pinned, view, locale, headingRef)}</div>
      ) : null}
    </div>
  );
}

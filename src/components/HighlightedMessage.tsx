import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { HighlightSegment } from "../ui";

interface HighlightedMessageProps {
  readonly segments: readonly HighlightSegment[];
  readonly locale: Locale;
}

export function HighlightedMessage({ segments, locale }: HighlightedMessageProps): ReactElement {
  return (
    <section className="mt-6">
      <h4 className="text-lg font-bold text-[color:var(--th-text)]">
        {t(locale, "result.message.heading")}
      </h4>
      <p className="mt-1 text-base text-[color:var(--th-muted)]">
        {t(locale, "result.message.note")}
      </p>
      <p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-[var(--th-border)] bg-[var(--th-surface)] p-3 text-base text-[color:var(--th-text)]">
        {segments.map((seg) =>
          seg.highlighted ? (
            <span key={seg.start}>
              <span className="sr-only">{t(locale, "result.highlight.srLabel")} </span>
              <mark className="rounded bg-[var(--th-accent)] px-1 text-[color:var(--th-on-accent)]">
                {seg.text}
              </mark>
            </span>
          ) : (
            <span key={seg.start}>{seg.text}</span>
          ),
        )}
      </p>
    </section>
  );
}

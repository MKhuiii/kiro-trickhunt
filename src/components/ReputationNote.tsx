import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { ReputationNoteView } from "../ui/view/reputation-note";

interface ReputationNoteProps {
  readonly note: ReputationNoteView;
  readonly locale: Locale;
}

/** Neutral note about the link lookup. Plain text only: no link, no interaction. */
export function ReputationNote({ note, locale }: ReputationNoteProps): ReactElement {
  if (note.kind === "unavailable") {
    return <p className="text-base text-[color:var(--th-muted)]">{t(locale, note.textKey)}</p>;
  }
  return (
    <div className="space-y-1">
      <p className="text-base text-[color:var(--th-muted)]">{t(locale, note.textKey)}</p>
      <p className="text-base text-[color:var(--th-muted)]">{t(locale, note.limitKey)}</p>
    </div>
  );
}

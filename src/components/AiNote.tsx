import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { ReadyResultView } from "../ui";
import { IconWarning } from "./icons";

interface AiNoteProps {
  readonly aiNote: NonNullable<ReadyResultView["aiNote"]>;
  readonly locale: Locale;
}

/** Visible, not collapsible, no close control. */
export function AiNote({ aiNote, locale }: AiNoteProps): ReactElement {
  return (
    <aside
      role="note"
      className="rounded-xl border-2 border-[var(--th-accent)] bg-[var(--th-raised)] p-4 text-[color:var(--th-text)]"
    >
      <h3 className="flex items-center gap-2 text-lg font-bold">
        <span className="text-xl text-[color:var(--th-accent)]">
          <IconWarning />
        </span>
        <span>{t(locale, aiNote.headingKey)}</span>
      </h3>
      <p className="mt-2 text-base">{t(locale, aiNote.textKey)}</p>
    </aside>
  );
}

import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";

interface LimitsNoteProps {
  readonly messageKey: "result.limitsNote";
  readonly locale: Locale;
}

/** Body-size paragraph. Not collapsed, no tooltip. */
export function LimitsNote({ messageKey, locale }: LimitsNoteProps): ReactElement {
  return <p className="text-base text-[color:var(--th-muted)]">{t(locale, messageKey)}</p>;
}

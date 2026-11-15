import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { MessageKey } from "../ui";

interface StatusRegionProps {
  readonly locale: Locale;
  readonly messageKey: MessageKey | null;
  readonly params?: Readonly<Record<string, string | number>>;
}

/** Always rendered so assistive technology sees the live region before it changes. */
export function StatusRegion({ locale, messageKey, params }: StatusRegionProps): ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[1.75rem] text-lg text-[color:var(--th-text)]"
    >
      {messageKey === null ? null : t(locale, messageKey, params)}
    </div>
  );
}

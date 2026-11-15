import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { NoticeView } from "../ui";
import { IconEye, IconWarning } from "./icons";

interface NoticesProps {
  readonly notices: readonly NoticeView[];
  readonly locale: Locale;
}

export function Notices({ notices, locale }: NoticesProps): ReactElement {
  return (
    <ul className="space-y-2">
      {notices.map((notice) => (
        <li
          key={notice.kind}
          className="flex items-start gap-2 rounded-xl border border-[var(--th-border)] bg-[var(--th-surface)] p-3 text-base text-[color:var(--th-text)]"
        >
          <span className="mt-1 shrink-0 text-[color:var(--th-accent)]">
            {notice.tone === "warning" ? <IconWarning /> : <IconEye />}
          </span>
          <span>{t(locale, notice.key, notice.params)}</span>
        </li>
      ))}
    </ul>
  );
}

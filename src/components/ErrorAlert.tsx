import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { MessageRef } from "../ui";
import { IconWarning } from "./icons";

interface ErrorAlertProps {
  readonly message: MessageRef;
  readonly locale: Locale;
}

export function ErrorAlert({ message, locale }: ErrorAlertProps): ReactElement {
  return (
    <div
      role="alert"
      className="rounded-xl border-2 border-[var(--th-accent)] bg-[var(--th-raised)] p-4 text-[color:var(--th-text)]"
    >
      <p className="flex items-start gap-2 text-lg font-semibold">
        <span className="text-xl text-[color:var(--th-accent)]">
          <IconWarning />
        </span>
        <span>{t(locale, message.key, message.params)}</span>
      </p>
      <details className="mt-3">
        <summary className="cursor-pointer text-base font-semibold">
          {t(locale, "result.tech.summary")}
        </summary>
        <p className="mt-2 font-mono text-sm break-all">
          {t(locale, "error.technical.label", { code: message.technicalCode })}
        </p>
      </details>
    </div>
  );
}

import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";

interface ActionBoxProps {
  readonly actions: readonly string[];
  readonly locale: Locale;
}

export function ActionBox({ actions, locale }: ActionBoxProps): ReactElement {
  return (
    <section className="rounded-xl border-2 border-[var(--th-accent)] bg-[var(--th-surface)] p-4 text-[color:var(--th-text)]">
      <h3 className="text-xl font-bold">{t(locale, "result.actions.heading")}</h3>
      <ol className="mt-2 list-decimal space-y-2 pl-6 text-lg">
        {actions.map((action, i) => (
          <li key={i}>{action}</li>
        ))}
      </ol>
    </section>
  );
}

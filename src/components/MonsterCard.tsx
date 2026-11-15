import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { ReadyResultView } from "../ui";

interface MonsterCardProps {
  readonly monster: ReadyResultView["monster"];
  readonly locale: Locale;
}

/** Secondary card. Its heading is smaller than the evidence heading. */
export function MonsterCard({ monster, locale }: MonsterCardProps): ReactElement {
  return (
    <section className="rounded-xl border border-[var(--th-border)] bg-[var(--th-surface)] p-4 text-[color:var(--th-text)]">
      <h3 className="text-base font-semibold text-[color:var(--th-muted)]">
        {t(locale, "result.monster.heading")}
      </h3>
      <div className="mt-3">
        <p className="text-lg font-bold">{t(locale, monster.nameKey)}</p>
        <p className="mt-1 text-base">{t(locale, monster.shortKey)}</p>
      </div>
      {monster.tipKeys.length > 0 ? (
        <div className="mt-3">
          <h4 className="text-base font-semibold">{t(locale, "result.tips.heading")}</h4>
          <ul className="mt-1 list-disc space-y-1 pl-6 text-base">
            {monster.tipKeys.map((key) => (
              <li key={key}>{t(locale, key)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

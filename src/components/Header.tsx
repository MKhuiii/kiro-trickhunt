import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { Preferences } from "../ui";
import { SettingsPanel } from "./SettingsPanel";
import type { PreferenceChange } from "./SettingsPanel";
import { FOCUS_RING } from "./styles";

interface HeaderProps {
  readonly prefs: Preferences;
  readonly locale: Locale;
  readonly onChange: PreferenceChange;
}

export function Header({ prefs, locale, onChange }: HeaderProps): ReactElement {
  return (
    <header className="space-y-3">
      <h1 className="text-4xl font-bold text-[color:var(--th-text)]">{t(locale, "app.name")}</h1>
      <p className="text-xl text-[color:var(--th-muted)]">{t(locale, "app.tagline")}</p>
      <details>
        <summary
          className={`inline-block cursor-pointer rounded-lg border-2 border-[var(--th-border)] bg-[var(--th-surface)] px-4 py-2 text-base font-semibold text-[color:var(--th-text)] ${FOCUS_RING}`}
        >
          {t(locale, "settings.open")}
        </summary>
        <div className="mt-3">
          <SettingsPanel prefs={prefs} locale={locale} onChange={onChange} />
        </div>
      </details>
    </header>
  );
}

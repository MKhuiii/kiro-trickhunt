import type { ChangeEvent, ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { Preferences } from "../ui";
import { FOCUS_RING } from "./styles";

export type PreferenceChange = <K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
) => void;

interface SettingsPanelProps {
  readonly prefs: Preferences;
  readonly locale: Locale;
  readonly onChange: PreferenceChange;
}

const TEXT_SIZES = [100, 125, 150] as const;
const LANGUAGES = ["en", "vi"] as const;

const FIELD = `rounded-lg border-2 border-[var(--th-border)] bg-[var(--th-bg)] px-3 py-2 text-base text-[color:var(--th-text)] ${FOCUS_RING}`;
const CHECK = `h-5 w-5 accent-[var(--th-accent)] ${FOCUS_RING}`;

export function SettingsPanel({ prefs, locale, onChange }: SettingsPanelProps): ReactElement {
  const onLanguage = (e: ChangeEvent<HTMLSelectElement>): void => {
    const v = e.target.value;
    if (v === "en" || v === "vi") onChange("language", v);
  };
  const onSize = (e: ChangeEvent<HTMLSelectElement>): void => {
    const v = Number(e.target.value);
    if (v === 100 || v === 125 || v === 150) onChange("textSize", v);
  };
  return (
    <fieldset className="space-y-4 rounded-xl border-2 border-[var(--th-border)] bg-[var(--th-surface)] p-4 text-[color:var(--th-text)]">
      <legend className="px-2 text-lg font-bold">{t(locale, "prefs.heading")}</legend>

      <div className="flex flex-col gap-1">
        <label htmlFor="pref-language" className="text-base font-semibold">
          {t(locale, "prefs.language")}
        </label>
        <select id="pref-language" value={prefs.language} onChange={onLanguage} className={FIELD}>
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {t(locale, `prefs.language.${lang}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="pref-text-size" className="text-base font-semibold">
          {t(locale, "prefs.textSize")}
        </label>
        <select
          id="pref-text-size"
          value={prefs.textSize}
          onChange={onSize}
          className={FIELD}
        >
          {TEXT_SIZES.map((size) => (
            <option key={size} value={size}>
              {t(locale, `prefs.textSize.${size}`)}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-3 text-base font-semibold">
        <input
          type="checkbox"
          checked={prefs.reduceMotion}
          onChange={(e) => onChange("reduceMotion", e.target.checked)}
          className={CHECK}
        />
        <span>{t(locale, "prefs.reduceMotion")}</span>
      </label>

      <label className="flex items-center gap-3 text-base font-semibold">
        <input
          type="checkbox"
          checked={prefs.highContrast}
          onChange={(e) => onChange("highContrast", e.target.checked)}
          className={CHECK}
        />
        <span>{t(locale, "prefs.highContrast")}</span>
      </label>
    </fieldset>
  );
}

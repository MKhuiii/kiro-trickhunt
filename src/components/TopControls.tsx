import { useRef, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { Preferences } from "../ui";
import { FlagEn, FlagVi, IconGear, IconSpeaker, IconSpeakerOff } from "./ControlIcons";
import { SettingsPanel } from "./SettingsPanel";
import type { PreferenceChange } from "./SettingsPanel";
import { FOCUS_RING } from "./styles";

interface TopControlsProps {
  readonly prefs: Preferences;
  readonly locale: Locale;
  readonly onChange: PreferenceChange;
}

/**
 * Three round buttons in the top-right corner: the language (shown as its
 * flag), the ambient sound (a speaker) and the settings (a gear). There is no
 * header bar. Every button has a text name from the dictionary; the icons are
 * decorative.
 */
export function TopControls({ prefs, locale, onChange }: TopControlsProps): ReactElement {
  const [open, setOpen] = useState(false);
  const gearRef = useRef<HTMLButtonElement>(null);
  const other = prefs.language === "en" ? "vi" : "en";

  const languageLabel = t(locale, "topbar.language", {
    name: t(locale, `prefs.language.${prefs.language}`),
    other: t(locale, `prefs.language.${other}`),
  });
  const soundLabel = t(locale, "settings.sound.label");
  const settingsLabel = t(locale, "settings.open");

  const onKeyDown = (e: KeyboardEvent<HTMLElement>): void => {
    if (e.key !== "Escape" || !open || e.nativeEvent.isComposing) return;
    setOpen(false);
    // The panel unmounts with focus inside it; return focus to the button that opened it.
    gearRef.current?.focus();
  };

  return (
    <div
      onKeyDown={onKeyDown}
      className="pointer-events-none absolute right-3 top-3 z-20 flex flex-col items-end gap-2"
    >
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange("language", other)}
          aria-label={languageLabel}
          title={languageLabel}
          className={`th-chip overflow-hidden ${FOCUS_RING}`}
        >
          {prefs.language === "en" ? <FlagEn /> : <FlagVi />}
        </button>
        <button
          type="button"
          aria-pressed={prefs.sound}
          onClick={() => onChange("sound", !prefs.sound)}
          aria-label={soundLabel}
          title={soundLabel}
          className={`th-chip ${FOCUS_RING}`}
        >
          {prefs.sound ? <IconSpeaker /> : <IconSpeakerOff />}
        </button>
        <button
          ref={gearRef}
          type="button"
          aria-expanded={open}
          aria-controls="settings-panel"
          onClick={() => setOpen((v) => !v)}
          aria-label={settingsLabel}
          title={settingsLabel}
          className={`th-chip ${FOCUS_RING}`}
        >
          <IconGear />
        </button>
      </div>
      {open ? (
        <div
          id="settings-panel"
          className="pointer-events-auto max-h-[calc(100dvh-5rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto bg-[var(--th-bg)] shadow-lg"
        >
          <SettingsPanel prefs={prefs} locale={locale} onChange={onChange} />
        </div>
      ) : null}
    </div>
  );
}

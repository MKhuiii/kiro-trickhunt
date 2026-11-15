import { useRef, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { Preferences } from "../ui";
import { SettingsPanel } from "./SettingsPanel";
import type { PreferenceChange } from "./SettingsPanel";
import { BUTTON_SECONDARY } from "./styles";

interface HeaderProps {
  readonly prefs: Preferences;
  readonly locale: Locale;
  readonly onChange: PreferenceChange;
}

/** Slim top bar: app name and the Settings button. The panel opens over the frame. */
export function Header({ prefs, locale, onChange }: HeaderProps): ReactElement {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const onKeyDown = (e: KeyboardEvent<HTMLElement>): void => {
    if (e.key !== "Escape" || !open || e.nativeEvent.isComposing) return;
    setOpen(false);
    // The panel unmounts with focus inside it; return focus to the button that opened it.
    buttonRef.current?.focus();
  };
  return (
    <header
      onKeyDown={onKeyDown}
      className="relative z-20 flex min-h-[2.75rem] shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b-2 border-[var(--th-border)] bg-[var(--th-surface)] px-4 py-2"
    >
      <h1 className="min-w-0 break-words text-xl font-bold text-[color:var(--th-text)]">
        {t(locale, "app.name")}
      </h1>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="settings-panel"
        onClick={() => setOpen((v) => !v)}
        className={`${BUTTON_SECONDARY} min-h-[2.75rem]`}
      >
        {t(locale, "settings.open")}
      </button>
      {open ? (
        <div
          id="settings-panel"
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-100%)] overflow-y-auto border-b-2 border-[var(--th-border)] bg-[var(--th-bg)] p-4 shadow-lg"
        >
          <div className="mx-auto max-w-3xl">
            <SettingsPanel prefs={prefs} locale={locale} onChange={onChange} />
          </div>
        </div>
      ) : null}
    </header>
  );
}

import type { ReactElement, Ref } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import { Art } from "./art/registry";
import { FOCUS_RING } from "./styles";

interface BestiaryButtonProps {
  readonly locale: Locale;
  readonly open: boolean;
  readonly onClick: () => void;
  readonly buttonRef?: Ref<HTMLButtonElement>;
}

/** The notebook picture that opens the field guide, in the top-left corner. The picture is decorative. */
export function BestiaryButton({ locale, open, onClick, buttonRef }: BestiaryButtonProps): ReactElement {
  return (
    <div className="pointer-events-none absolute left-3 top-[3.75rem] z-20 max-w-[calc(100%-1.5rem)] @min-[18rem]:top-3 @min-[18rem]:max-w-[calc(100%-11.25rem)]">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onClick}
        className={`pointer-events-auto flex max-h-12 min-h-11 min-w-11 max-w-full items-center gap-2 rounded-xl border-2 border-[var(--th-border)] bg-[var(--th-surface)] px-2 py-0.5 text-left text-base font-semibold leading-tight text-[color:var(--th-text)] ${FOCUS_RING}`}
      >
        <span className="block h-7 w-7 shrink-0" aria-hidden="true">
          <Art id="notebook" className="h-full w-full" />
        </span>
        <span className="min-w-0 [overflow-wrap:anywhere]">{t(locale, "bestiary.open")}</span>
      </button>
    </div>
  );
}

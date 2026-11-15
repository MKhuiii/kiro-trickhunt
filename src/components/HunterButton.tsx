import { forwardRef } from "react";
import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { MessageKey } from "../ui";
import { Art } from "./art/registry";
import { FOCUS_RING } from "./styles";

interface HunterButtonProps {
  readonly locale: Locale;
  readonly onOpen: () => void;
  /** Caption under the hunter. Defaults to the home caption. */
  readonly captionKey?: MessageKey;
}

const PANEL =
  "rounded-xl border border-[var(--th-border)] bg-[var(--th-surface)] p-4 text-base text-[color:var(--th-text)]";

/**
 * Home step: the whole hunter figure is one real button that opens the bag.
 * The art is decorative; the accessible name comes from the dictionary. The
 * caption and the privacy note sit below on surface panels, never on the art.
 */
export const HunterButton = forwardRef<HTMLButtonElement, HunterButtonProps>(function HunterButton(
  { locale, onOpen, captionKey = "scene.home.caption" },
  ref,
): ReactElement {
  return (
    <div className="my-auto flex w-full flex-col items-center gap-3">
      <button
        ref={ref}
        type="button"
        onClick={onOpen}
        aria-label={t(locale, "home.hunter.action")}
        className={`block h-[min(50dvh,24rem)] [@media(max-height:32rem)]:h-[min(32dvh,24rem)] min-h-[2.75rem] w-[min(60%,16rem)] min-w-[2.75rem] cursor-pointer rounded-xl ${FOCUS_RING}`}
      >
        <Art id="hunter" pose="idle" className="h-full w-full" />
      </button>
      <p className={`${PANEL} w-full max-w-prose text-center`}>{t(locale, captionKey)}</p>
      <p className={`${PANEL} w-full max-w-prose`}>{t(locale, "privacy.note")}</p>
    </div>
  );
});

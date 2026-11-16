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
      <div className="th-title-scrim relative z-10 w-full px-4 pb-6 pt-6 text-center">
        <h1 className="th-logo text-6xl md:text-7xl">{t(locale, "app.name")}</h1>
        <p className="mx-auto mt-2 max-w-prose text-lg text-[color:var(--th-muted)]">
          {t(locale, "app.tagline")}
        </p>
      </div>
      <button
        ref={ref}
        type="button"
        onClick={onOpen}
        aria-label={t(locale, "home.hunter.action")}
        className={`relative z-10 block h-[min(40dvh,22rem)] [@media(max-height:32rem)]:h-[min(28dvh,22rem)] min-h-[2.75rem] w-[min(60%,16rem)] min-w-[2.75rem] cursor-pointer rounded-xl ${FOCUS_RING}`}
      >
        <Art id="hunter" pose="idle" className="h-full w-full" />
      </button>
      <div className="th-caption th-caption-float relative z-10 w-full px-4 pb-8 pt-10 text-center">
        <p className="mx-auto max-w-prose text-lg">{t(locale, captionKey)}</p>
        <p className="mx-auto mt-2 max-w-prose text-base text-[color:var(--th-muted)]">
          {t(locale, "privacy.note")}
        </p>
      </div>
    </div>
  );
});

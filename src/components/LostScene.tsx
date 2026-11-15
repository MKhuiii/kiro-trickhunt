import type { ReactElement, ReactNode } from "react";
import type { Locale } from "../pipeline";
import { sceneFor, t } from "../ui";
import { Art } from "./art/registry";
import { BUTTON_SECONDARY } from "./styles";

interface LostSceneProps {
  readonly locale: Locale;
  readonly onAgain: () => void;
  /** The existing `ErrorAlert`, the withheld notice or a status line. */
  readonly children?: ReactNode;
}

/** Lost step: downcast hunter in thick fog, the message and "Hunt again". */
export function LostScene({ locale, onAgain, children }: LostSceneProps): ReactElement {
  const scene = sceneFor({ step: "lost" });
  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      <Art id="backdrop-home" className="absolute inset-0 h-full w-full" />
      <div className="absolute bottom-[30%] left-1/2 h-[40%] min-h-[6rem] w-[40%] min-w-[6rem] -translate-x-1/2">
        <Art id="hunter" pose="downcast" className="h-full w-full" />
      </div>
      <div
        className="th-lost-fade pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "linear-gradient(to top, var(--th-fog) 0%, var(--th-fog) 35%, transparent 100%)",
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center overflow-y-auto p-3">
        <div className="mt-auto w-full max-w-prose space-y-3 rounded-xl border border-[var(--th-border)] bg-[var(--th-surface)] p-3 text-base text-[color:var(--th-text)]">
          <p>{t(locale, scene.captionKey)}</p>
          {children}
          <button type="button" onClick={onAgain} className={`min-h-11 ${BUTTON_SECONDARY}`}>
            {t(locale, "hunt.again")}
          </button>
        </div>
      </div>
    </div>
  );
}

import type { ReactElement, ReactNode } from "react";
import type { Locale } from "../pipeline";
import { sceneFor, t } from "../ui";
import type { Leg } from "../ui";
import { Art } from "./art/registry";
import type { ArtId } from "./art/registry";

interface HuntSceneProps {
  readonly locale: Locale;
  readonly leg: Leg;
  /** The existing `StatusRegion` (the only live region). Rendered as is. */
  readonly children?: ReactNode;
}

const BACKDROP: Readonly<Record<Leg, ArtId>> = {
  forest: "backdrop-forest",
  mountain: "backdrop-mountain",
  swamp: "backdrop-swamp",
  ruins: "backdrop-ruins",
};

const HUNTER_POSE: Readonly<Record<Leg, string>> = {
  forest: "tracking",
  mountain: "lantern",
  swamp: "reading",
  ruins: "aiming",
};

/**
 * Hunting step: the backdrop of the current Leg, the walking hunter and the
 * running Shade ahead. The caption sits on a surface panel, never on the art,
 * and is not a live region; `children` (the StatusRegion) stays mounted across
 * Legs so only it announces. The art is decorative.
 */
export function HuntScene({ locale, leg, children }: HuntSceneProps): ReactElement {
  const scene = sceneFor({ step: "hunting", leg });
  const current: Leg = scene.leg ?? leg;
  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden" data-leg={current}>
      <div key={current} className="th-leg-in absolute inset-0">
        <Art id={BACKDROP[current]} className="absolute inset-x-0 top-0 h-[107%] w-full" />
        <div
          data-actor="hunter"
          data-actor-key={HUNTER_POSE[current]}
          className="absolute bottom-[22%] left-[8%] h-[46%] w-[28%] min-w-[4rem]"
        >
          <div className="th-walk h-full w-full">
            <Art id="hunter" pose={HUNTER_POSE[current]} className="h-full w-full" />
          </div>
        </div>
        <div
          data-actor="shade"
          data-actor-key="run1"
          className="absolute bottom-[22%] right-[8%] h-[36%] w-[24%] min-w-[3.5rem]"
        >
          <div className="th-shade-run h-full w-full">
            <Art id="shade" pose="run1" className="h-full w-full" />
          </div>
        </div>
      </div>
      <div className="th-caption absolute inset-x-0 bottom-0 z-10 px-4 pb-3 pt-10">
        <div className="mx-auto max-h-[40dvh] max-w-prose overflow-y-auto text-center text-lg">
          <p>{t(locale, scene.captionKey)}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

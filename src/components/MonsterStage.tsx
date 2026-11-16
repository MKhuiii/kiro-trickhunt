import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { MONSTER_PRESENTATION, sceneFor, t } from "../ui";
import type { MonsterKey } from "../ui";
import { Art } from "./art/registry";

interface MonsterStageProps {
  readonly locale: Locale;
  readonly monster: MonsterKey;
}

/**
 * Revealed step: the monster large in the middle, in its own color, with a
 * caption on a surface panel. The art is decorative; the name is in the caption.
 */
export function MonsterStage({ locale, monster }: MonsterStageProps): ReactElement {
  const scene = sceneFor({ step: "revealed", monster });
  const presentation = MONSTER_PRESENTATION[scene.monster ?? monster];
  const caption = t(locale, scene.captionKey, { name: t(locale, presentation.nameKey) });
  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden"
      data-monster={presentation.id}
    >
      <Art id="backdrop-home" className="absolute inset-0 h-full w-full opacity-40" />
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 pr-[9.5rem] md:pr-3">
        <div
          data-actor="monster"
          data-actor-key={presentation.id}
          className="h-full max-h-[32rem] w-full max-w-[32rem]"
        >
          <div
            className="th-reveal h-full w-full"
            style={{ color: `var(--th-${presentation.colorToken})` }}
          >
            <Art id={presentation.artKey} className="h-full w-full" />
          </div>
        </div>
      </div>
      <div className="th-caption relative z-10 w-full shrink-0 px-4 pb-3 pt-8">
        <p className="mx-auto max-h-[30dvh] max-w-prose overflow-y-auto text-center text-lg">
          {caption}
        </p>
      </div>
    </div>
  );
}

import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { MONSTER_PRESENTATION, sceneFor, t } from "../ui";
import type { LinkCreatureView, MonsterKey } from "../ui";
import { LINK_CREATURE_COLOR, LINK_CREATURE_DISC, LinkCreatureArt } from "./art/link-creatures";
import { Art } from "./art/registry";

interface MonsterStageProps {
  readonly locale: Locale;
  readonly monster: MonsterKey;
  /** Link creatures found in the message, shown next to the monster. */
  readonly linkCreatures?: readonly LinkCreatureView[];
}

/**
 * Revealed step: the monster large in the middle, in its own color, with a
 * caption on a surface panel only when nothing was found. When a monster is found,
 * the art is decorative and its name is shown in the journal, not here.
 */
export function MonsterStage({ locale, monster, linkCreatures = [] }: MonsterStageProps): ReactElement {
  const scene = sceneFor({ step: "revealed", monster });
  const presentation = MONSTER_PRESENTATION[scene.monster ?? monster];
  const caption = presentation.id === "neutral" ? t(locale, scene.captionKey) : null;
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
      {linkCreatures.length > 0 ? (
        <ul className="th-caption relative z-10 flex w-full shrink-0 flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 pb-2 pt-4">
          {linkCreatures.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <span className={LINK_CREATURE_DISC} style={{ color: LINK_CREATURE_COLOR }}>
                <LinkCreatureArt artKey={c.artKey} className="h-14 w-14 md:h-20 md:w-20" />
              </span>
              <span className="text-lg font-bold">{t(locale, c.nameKey)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {caption ? (
        <div className="th-caption relative z-10 w-full shrink-0 px-4 pb-3 pt-8">
          <p className="mx-auto max-h-[30dvh] max-w-prose overflow-y-auto text-center text-lg">
            {caption}
          </p>
        </div>
      ) : null}
    </div>
  );
}

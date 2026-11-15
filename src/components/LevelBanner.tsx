import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { ReadyResultView } from "../ui";
import { LevelIcon } from "./icons";

const LEVEL_COLOR_VAR = [
  "var(--th-level-none)",
  "var(--th-level-suspicious)",
  "var(--th-level-high)",
  "var(--th-level-critical)",
] as const;

interface LevelBannerProps {
  readonly view: ReadyResultView;
  readonly locale: Locale;
}

/** Level icon, label and meter. Never shows the monster name. */
export function LevelBanner({ view, locale }: LevelBannerProps): ReactElement {
  const { riskMeter } = view;
  const color = LEVEL_COLOR_VAR[riskMeter.darknessBand];
  return (
    <section
      className="rounded-xl border-2 bg-[var(--th-surface)] p-4 text-[color:var(--th-text)]"
      style={{ borderColor: color }}
    >
      <p className="flex items-center gap-3 text-2xl font-bold">
        <span className="text-3xl" style={{ color }}>
          <LevelIcon iconKey={riskMeter.iconKey} />
        </span>
        <span>{t(locale, view.levelKey)}</span>
      </p>
      <p className="mt-2 text-base">
        {t(locale, "result.meter.label", { percent: riskMeter.percent })}
      </p>
      <div
        aria-hidden="true"
        className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[var(--th-raised)]"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${riskMeter.percent}%`, backgroundColor: color }}
        />
      </div>
    </section>
  );
}

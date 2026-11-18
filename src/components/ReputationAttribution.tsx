import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import { ADVISORY_URL } from "../ui/reputation.config";
import { FOCUS_RING } from "./styles";

interface ReputationAttributionProps {
  /** True only when the result holds a Listing_Signal. */
  readonly listed: boolean;
  readonly locale: Locale;
}

/** The one link in the app (design D8). Renders nothing unless a link is listed. */
export function ReputationAttribution({ listed, locale }: ReputationAttributionProps): ReactElement | null {
  if (!listed) return null;
  return (
    <p className="text-base text-[color:var(--th-text)]">
      <a
        href={ADVISORY_URL}
        target="_blank"
        rel="noopener noreferrer"
        referrerPolicy="no-referrer"
        className={`underline ${FOCUS_RING}`}
      >
        {t(locale, "reputation.attribution.text")}
        <span className="sr-only"> {t(locale, "reputation.attribution.newTab")}</span>
      </a>
    </p>
  );
}

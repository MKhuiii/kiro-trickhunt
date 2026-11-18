import type { ReactElement } from "react";

/** Original inline icons. Decorative: a text label always sits beside them. */

interface IconProps {
  readonly className?: string;
}

function Frame({
  className,
  children,
}: IconProps & { readonly children: ReactElement | readonly ReactElement[] }): ReactElement {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function IconCandle({ className }: IconProps): ReactElement {
  return (
    <Frame className={className}>
      <path d="M12 2c2 2.5 2 4 0 5.5C10 6 10 4.5 12 2z" fill="currentColor" />
      <rect x="8" y="9" width="8" height="12" rx="1" />
      <path d="M12 7.5V9M6 21h12" />
    </Frame>
  );
}

export function IconEye({ className }: IconProps): ReactElement {
  return (
    <Frame className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </Frame>
  );
}

export function IconWarning({ className }: IconProps): ReactElement {
  return (
    <Frame className={className}>
      <path d="M12 3L2 20h20L12 3z" />
      <path d="M12 9.5v5M12 17.5v.5" />
    </Frame>
  );
}

export function IconStop({ className }: IconProps): ReactElement {
  return (
    <Frame className={className}>
      <path d="M8 2h8l6 6v8l-6 6H8l-6-6V8l6-6z" />
      <path d="M8 8l8 8M16 8l-8 8" />
    </Frame>
  );
}

/** Two linked loops. Also the fallback for link art. */
export function IconLink({ className }: IconProps): ReactElement {
  return (
    <Frame className={className}>
      <rect x="2" y="8" width="12" height="8" rx="4" />
      <rect x="10" y="8" width="12" height="8" rx="4" />
    </Frame>
  );
}

/** Tone icons differ by shape (filled diamond, half circle, open circle), not by color. */
export function IconToneStrong({ className }: IconProps): ReactElement {
  return (
    <Frame className={className}>
      <path d="M12 2l10 10-10 10L2 12 12 2z" fill="currentColor" />
    </Frame>
  );
}

export function IconToneMedium({ className }: IconProps): ReactElement {
  return (
    <Frame className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
    </Frame>
  );
}

export function IconToneSoft({ className }: IconProps): ReactElement {
  return (
    <Frame className={className}>
      <circle cx="12" cy="12" r="9" />
    </Frame>
  );
}

const TONE_ICONS: Readonly<Record<string, (props: IconProps) => ReactElement>> = {
  "icon-tone-strong": IconToneStrong,
  "icon-tone-medium": IconToneMedium,
  "icon-tone-soft": IconToneSoft,
};

/** Renders a tone icon by key. Unknown, inherited or non-string keys fall back to the soft icon. */
export function ToneIcon({
  iconKey,
  className,
}: {
  readonly iconKey: unknown;
  readonly className?: string;
}): ReactElement {
  const Icon =
    typeof iconKey === "string" && Object.hasOwn(TONE_ICONS, iconKey)
      ? TONE_ICONS[iconKey]
      : IconToneSoft;
  return <Icon className={className} />;
}

const ICONS: Readonly<Record<string, (props: IconProps) => ReactElement>> = {
  "icon-candle": IconCandle,
  "icon-eye": IconEye,
  "icon-warning": IconWarning,
  "icon-stop": IconStop,
};

/** Renders the icon for a `LEVEL_PRESENTATION` `iconKey`. Unknown keys fall back to the eye. */
export function LevelIcon({
  iconKey,
  className,
}: {
  readonly iconKey: string;
  readonly className?: string;
}): ReactElement {
  const Icon = ICONS[iconKey] ?? IconEye;
  return <Icon className={className} />;
}

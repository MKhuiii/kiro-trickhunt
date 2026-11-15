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

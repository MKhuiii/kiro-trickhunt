import type { ReactElement, ReactNode } from "react";
import type { FlowStep } from "../ui";

interface FrameProps {
  readonly step: FlowStep;
  /** Slim top bar. */
  readonly bar: ReactNode;
  /** Stage area. Each child scrolls inside itself when needed. */
  readonly children: ReactNode;
}

/** The fixed frame: the page never scrolls, only regions inside it do. */
export function Frame({ step, bar, children }: FrameProps): ReactElement {
  return (
    <div
      data-step={step}
      className="relative flex h-dvh flex-col overflow-hidden bg-[var(--th-bg)] text-[color:var(--th-text)]"
    >
      {bar}
      <main id="main" tabIndex={-1} className="flex min-h-0 flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}

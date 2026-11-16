import type { ReactElement, ReactNode } from "react";
import type { FlowStep } from "../ui";

interface FrameProps {
  readonly step: FlowStep;
  /** The round language, sound and settings buttons in the top-right corner. */
  readonly controls?: ReactNode;
  /** Decorative atmosphere layer above the SVG art and below the text panels. */
  readonly stage?: ReactNode;
  /** Stage area. Each child scrolls inside itself when needed. */
  readonly children: ReactNode;
}

/** The fixed frame: the page never scrolls, only regions inside it do. There is no header bar. */
export function Frame({ step, controls, stage, children }: FrameProps): ReactElement {
  return (
    <div
      data-step={step}
      className="relative isolate flex h-dvh flex-col overflow-hidden bg-[var(--th-bg)] text-[color:var(--th-text)]"
    >
      <main id="main" tabIndex={-1} className="flex min-h-0 flex-1 flex-col">
        {children}
      </main>
      {stage}
      {controls}
    </div>
  );
}

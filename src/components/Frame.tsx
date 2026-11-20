import type { ReactElement, ReactNode } from "react";
import type { FlowStep } from "../ui";

interface FrameProps {
  readonly step: FlowStep;
  /** The round language, sound and settings buttons in the top-right corner. */
  readonly controls?: ReactNode;
  /**
   * The field guide button in the top-left corner. It positions itself (absolute), is rendered first
   * so Tab reaches it first, and adds a spacer below 18rem so (a container query on the frame, so the page's own text size scales it) content starts under its second row.
   */
  readonly guide?: ReactNode;
  /** Decorative atmosphere layer above the SVG art and below the text panels. */
  readonly stage?: ReactNode;
  /** Stage area. Each child scrolls inside itself when needed. */
  readonly children: ReactNode;
}

/** The fixed frame: the page never scrolls, only regions inside it do. There is no header bar. */
export function Frame({ step, controls, guide, stage, children }: FrameProps): ReactElement {
  return (
    <div
      data-step={step}
      className="@container relative isolate flex h-dvh flex-col overflow-hidden bg-[var(--th-bg)] text-[color:var(--th-text)]"
    >
      {guide}
      {guide ? <div aria-hidden="true" className="h-[6.5rem] shrink-0 @min-[18rem]:hidden" /> : null}
      <main id="main" tabIndex={-1} className="flex min-h-0 flex-1 flex-col">
        {children}
      </main>
      {stage}
      {controls}
    </div>
  );
}

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, ReactElement, RefObject } from "react";
import type { Locale } from "../pipeline";
import {
  BESTIARY_ENTRIES,
  clampPage,
  entryForPage,
  flipSpread,
  flipTarget,
  pageCount,
  pagesOfSpread,
  spreadCount,
  spreadOf,
  t,
  visiblePages,
} from "../ui";
import type { FlipDirection } from "../ui";
import { NotebookContents } from "./NotebookContents";
import { NotebookPage } from "./NotebookPage";
import { FOCUS_RING } from "./styles";
import { useLayoutMode } from "./use-layout-mode";

/**
 * Index to focus after Tab (or Shift+Tab) among `count` focusable elements.
 * Wraps at both ends. An out-of-range `current` is treated as "before the
 * first" (forward) or "after the last" (backward). Returns -1 when count < 1.
 */
export function nextFocusIndex(count: number, current: number, shift: boolean): number {
  if (!Number.isFinite(count) || count < 1) return -1;
  const n = Math.floor(count);
  const inRange = Number.isInteger(current) && current >= 0 && current < n;
  if (!inRange) return shift ? n - 1 : 0;
  return shift ? (current - 1 + n) % n : (current + 1) % n;
}

interface BestiaryPanelProps {
  readonly locale: Locale;
  readonly onClose: () => void;
  readonly returnFocusRef: RefObject<HTMLElement | null>;
}

const TEXT = "text-[color:var(--th-text)]";
const FOCUSABLE = "button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
const NAV_BUTTON = `min-h-11 min-w-11 rounded-xl border-2 border-[var(--th-border)] bg-[var(--th-surface)] px-4 py-2 text-base font-semibold ${TEXT} ${FOCUS_RING}`;

/** The field guide, a notebook flipped one page at a time. It takes no check data. */
export function BestiaryPanel({ locale, onClose, returnFocusRef }: BestiaryPanelProps): ReactElement {
  const titleId = useId();
  const count = pageCount(BESTIARY_ENTRIES);
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<FlipDirection | null>(null);
  const [navTick, setNavTick] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const mode = useLayoutMode();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const handledTick = useRef(0);

  // Focus moves in on open and returns to the notebook button on close.
  useEffect(() => {
    titleRef.current?.focus();
    const back = returnFocusRef;
    return () => {
      back.current?.focus();
    };
  }, [returnFocusRef]);

  const { left, right } = visiblePages(page, count, mode);
  const nameOf = (p: number): string => {
    const e = entryForPage(BESTIARY_ENTRIES, p);
    return e ? t(locale, e.nameKey) : t(locale, "bestiary.toc.heading");
  };
  const range = right === undefined ? String(left + 1) : `${left + 1}-${right + 1}`;
  const pageName = right === undefined ? nameOf(left) : `${nameOf(left)}, ${nameOf(right)}`;
  const pageLabel = t(locale, "bestiary.page.label", { current: range, total: count, name: pageName });

  // After a flip or a sticker jump (not on open, not on a resize): focus the left heading and announce.
  useEffect(() => {
    if (navTick === handledTick.current) return;
    handledTick.current = navTick;
    headingRef.current?.focus();
    setAnnouncement(pageLabel);
  }, [navTick, pageLabel]);

  const lastSpread = spreadCount(count) - 1;
  const hasPrev = mode === "spread" ? spreadOf(page, count) > 0 : page > 0;
  const hasNext = mode === "spread" ? spreadOf(page, count) < lastSpread : page < count - 1;

  const targetOf = (dir: FlipDirection): number =>
    mode === "spread"
      ? pagesOfSpread(flipSpread(spreadOf(page, count), count, dir), count).left
      : flipTarget(page, count, dir);

  const flip = (dir: FlipDirection): void => {
    if (dir === "prev" ? !hasPrev : !hasNext) return;
    setDirection(dir);
    setPage(targetOf(dir));
    setNavTick((n) => n + 1);
  };

  const goTo = (target: number): void => {
    const next = clampPage(target, count);
    const forward = mode === "spread" ? spreadOf(next, count) >= spreadOf(page, count) : next >= page;
    setDirection(forward ? "next" : "prev");
    setPage(next);
    setNavTick((n) => n + 1);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      if (event.nativeEvent.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
      const dir: FlipDirection = event.key === "ArrowRight" ? "next" : "prev";
      if (dir === "prev" ? !hasPrev : !hasNext) return;
      event.preventDefault();
      flip(dir);
      return;
    }
    if (event.key !== "Tab") return;
    const root = dialogRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const current = items.indexOf(document.activeElement as HTMLElement);
    const atEdge = event.shiftKey ? current <= 0 : current === items.length - 1 || current < 0;
    if (!atEdge) return;
    event.preventDefault();
    items[nextFocusIndex(items.length, current, event.shiftKey)]?.focus();
  };

  const handleBackdrop = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) onClose();
  };

  const flipClass = direction === null ? "" : direction === "next" ? "th-flip-next" : "th-flip-prev";
  const leftFlip = mode === "spread" && direction === "next" ? "" : flipClass;
  const rightFlip = mode === "spread" && direction === "next" ? flipClass : "";
  const renderLeaf = (p: number, ref: RefObject<HTMLHeadingElement | null> | undefined): ReactElement => {
    const e = entryForPage(BESTIARY_ENTRIES, p);
    const label = t(locale, "bestiary.page.label", { current: p + 1, total: count, name: nameOf(p) });
    return (
      <div className="th-notebook-leaf-scroll" role="region" tabIndex={0} aria-label={label}>
        {e ? (
          <NotebookPage locale={locale} entry={e} isLast={p === count - 1} headingRef={ref} />
        ) : (
          <NotebookContents locale={locale} onGoTo={goTo} headingRef={ref} />
        )}
      </div>
    );
  };
  const buttonSpacer = <span className="min-h-11 min-w-11" aria-hidden="true" />;

  return (
    <div
      onMouseDown={handleBackdrop}
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-1 min-[24rem]:p-3"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        className={`flex max-h-[90dvh] w-full max-w-xl min-[48rem]:max-w-4xl flex-col gap-3 overflow-y-auto rounded-2xl border-2 border-[var(--th-border)] bg-[var(--th-surface)] p-2 min-[24rem]:p-3 ${TEXT}`}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id={titleId} ref={titleRef} tabIndex={-1} className={`th-hand min-w-0 text-2xl ${TEXT} ${FOCUS_RING}`}>
            {t(locale, "bestiary.title")}
          </h2>
          <button type="button" onClick={onClose} className={`shrink-0 ${NAV_BUTTON}`}>
            {t(locale, "bestiary.close")}
          </button>
        </div>
        <div className="th-notebook th-notebook-spread flex min-h-[6rem] flex-1 flex-col" data-layout={mode}>
          <span className="th-notebook-edges" aria-hidden="true" />
          <span className="th-notebook-gutter" aria-hidden="true" />
          <span className="th-notebook-stitch" aria-hidden="true" />
          <span className="th-notebook-ribbon" aria-hidden="true" />
          <div className="th-notebook-page-area min-h-0 flex-1">
            <div className="th-notebook-leaves">
              <div key={left} className={`th-notebook-leaf th-notebook-leaf-left ${mode === "spread" ? leftFlip : flipClass}`}>
                {renderLeaf(left, headingRef)}
              </div>
              {right !== undefined ? (
                <div key={right} className={`th-notebook-leaf th-notebook-leaf-right ${rightFlip}`}>
                  {renderLeaf(right, undefined)}
                </div>
              ) : mode === "spread" ? (
                <div className="th-notebook-leaf th-notebook-leaf-right" aria-hidden="true" />
              ) : null}
            </div>
          </div>
        </div>
        <div className="th-notebook-nav flex flex-none flex-wrap items-center justify-between gap-2">
          {hasPrev ? (
            <button type="button" onClick={() => flip("prev")} className={NAV_BUTTON}>
              {t(locale, "bestiary.page.prev")}
            </button>
          ) : (
            buttonSpacer
          )}
          {hasNext ? (
            <button type="button" onClick={() => flip("next")} className={NAV_BUTTON}>
              {t(locale, "bestiary.page.next")}
            </button>
          ) : (
            buttonSpacer
          )}
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
    </div>
  );
}

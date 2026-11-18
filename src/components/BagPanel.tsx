import { useEffect, useRef } from "react";
import type {
  ChangeEvent,
  DragEvent,
  FormEvent,
  KeyboardEvent,
  MutableRefObject,
  ReactElement,
  Ref,
} from "react";
import type { Locale } from "../pipeline";
import { canConfirm, shouldSubmitOnEnter, t } from "../ui";
import type { Slots } from "../ui";
import { Art } from "./art/registry";
import { FOCUS_RING } from "./styles";

export type BagSlot = "text" | "image";

interface BagPanelProps {
  readonly locale: Locale;
  readonly slots: Slots;
  readonly text: string;
  readonly file: File | null;
  /** True while a check is running; confirming is blocked. */
  readonly busy?: boolean;
  /** Optional access to the heading; BagPanel itself focuses it on mount. */
  readonly headingRef?: Ref<HTMLHeadingElement>;
  /** Consent_Box state for this one scan. Held by the parent in memory only, never stored. */
  readonly checkLinks?: boolean;
  readonly onCheckLinksChange?: (next: boolean) => void;
  readonly onToggle: (slot: BagSlot) => void;
  readonly onTextChange: (text: string) => void;
  readonly onFileChange: (file: File | null) => void;
  readonly onConfirm: () => void;
  /** Called on Esc and the close button. The parent must return focus to the hunter button. */
  readonly onClose: () => void;
}

export function firstImage(files: FileList | readonly File[] | null | undefined): File | null {
  if (!files) return null;
  for (const file of Array.from(files)) {
    if (file.type.startsWith("image/")) return file;
  }
  return null;
}

const TEXT = "text-[color:var(--th-text)]";

/**
 * The hunter's bag: two cloth pockets, a ruled sheet for the message, a photo
 * for the picture and a wax seal to start. No form box. The controls are real
 * labelled form controls; the drawings are decorative.
 */
export function BagPanel({
  locale,
  slots,
  text,
  file,
  busy = false,
  headingRef,
  checkLinks = false,
  onCheckLinksChange,
  onToggle,
  onTextChange,
  onFileChange,
  onConfirm,
  onClose,
}: BagPanelProps): ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmable = canConfirm(slots, text, file);

  // A file input cannot be controlled; clear it when the image is removed.
  useEffect(() => {
    if (file === null && fileInputRef.current) fileInputRef.current.value = "";
  }, [file]);

  // Opening the bag moves focus to its heading (REQ-HUNT-20).
  const ownHeadingRef = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    ownHeadingRef.current?.focus();
  }, []);
  const setHeading = (node: HTMLHeadingElement | null): void => {
    ownHeadingRef.current = node;
    if (typeof headingRef === "function") headingRef(node);
    else if (headingRef) (headingRef as MutableRefObject<HTMLHeadingElement | null>).current = node;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (confirmable && !busy) onConfirm();
  };
  // Enter confirms, Shift+Enter is a new line, IME composition is ignored (REQ-HUNT-18).
  const handleTextKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    const submit = shouldSubmitOnEnter({
      key: event.key,
      shiftKey: event.shiftKey,
      isComposing: event.nativeEvent.isComposing,
      canConfirm: confirmable && !busy,
    });
    if (!submit) return;
    event.preventDefault();
    onConfirm();
  };
  // Esc closes the bag; the parent returns focus to the hunter button (REQ-HUNT-19).
  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>): void => {
    if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    onClose();
  };
  const handlePick = (event: ChangeEvent<HTMLInputElement>): void => {
    onFileChange(firstImage(event.target.files));
  };
  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const dropped = firstImage(event.dataTransfer.files);
    if (dropped) onFileChange(dropped);
  };

  const pocket = (
    slot: BagSlot,
    labelKey: "bag.text.label" | "bag.image.label",
    pose: "paper" | "photo",
  ): ReactElement => {
    const on = slots[slot];
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => onToggle(slot)}
        className={`flex min-h-11 flex-col items-center gap-1 px-2 py-1 text-base font-semibold ${TEXT} ${
          on ? "" : "opacity-70"
        } ${FOCUS_RING}`}
      >
        <span className="block h-14 w-14" aria-hidden="true">
          <Art id="bag" pose={pose} className="h-full w-full" />
        </span>
        <span className={on ? "underline decoration-2 underline-offset-4" : undefined}>
          {t(locale, labelKey)}
        </span>
        <span className="text-sm font-normal">{t(locale, on ? "bag.slot.on" : "bag.slot.off")}</span>
      </button>
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleFormKeyDown}
      className={`th-scrim relative z-10 flex min-h-0 flex-col gap-3 overflow-y-auto px-6 py-4 ${TEXT}`}
    >
      <h2
        ref={setHeading}
        tabIndex={-1}
        className={`th-hand text-3xl ${TEXT} ${FOCUS_RING}`}
      >
        {t(locale, "bag.heading")}
      </h2>

      <div className="flex flex-wrap gap-6">
        {pocket("text", "bag.text.label", "paper")}
        {pocket("image", "bag.image.label", "photo")}
      </div>

      {slots.text ? (
        <div className="th-paper th-ruled flex flex-col gap-1 px-5 py-4">
          <label htmlFor="input-text" className="th-hand text-xl text-[color:var(--th-ink)]">
            {t(locale, "input.text.label")}
          </label>
          <textarea
            id="input-text"
            rows={3}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={handleTextKeyDown}
            aria-describedby="input-text-hint"
            className={`min-h-11 w-full resize-none bg-transparent text-lg leading-8 text-[color:var(--th-ink)] ${FOCUS_RING}`}
          />
          <p id="input-text-hint" className="text-base text-[color:var(--th-ink-faded)]">
            {t(locale, "input.text.hint")}
          </p>
        </div>
      ) : null}

      {slots.image ? (
        <div onDragOver={handleDragOver} onDrop={handleDrop} className="flex flex-col gap-1">
          <label htmlFor="input-image" className={`th-hand text-xl ${TEXT}`}>
            {t(locale, "input.image.label")}
          </label>
          <input
            ref={fileInputRef}
            id="input-image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handlePick}
            aria-describedby="input-image-hint"
            className={`block min-h-11 w-full text-base ${TEXT} file:mr-3 file:min-h-11 file:cursor-pointer file:border-0 file:bg-transparent file:px-1 file:font-bold file:text-[color:var(--th-text)] file:underline file:underline-offset-4 ${FOCUS_RING}`}
          />
          <p id="input-image-hint" className="text-base text-[color:var(--th-muted)]">
            {t(locale, "input.image.hint")} {t(locale, "input.paste.hint")}
          </p>
          {file !== null ? (
            <p className={`flex flex-wrap items-center gap-3 text-base ${TEXT}`}>
              <span>{t(locale, "input.image.selected")}</span>
              <button
                type="button"
                onClick={() => onFileChange(null)}
                className={`th-text-button ${FOCUS_RING}`}
              >
                {t(locale, "input.image.remove")}
              </button>
            </p>
          ) : null}
        </div>
      ) : null}

      {!confirmable ? (
        <p id="bag-need-one" className={`text-base ${TEXT}`}>
          {t(locale, "bag.needOne")}
        </p>
      ) : null}
      <p className="hidden text-base text-[color:var(--th-muted)] md:block">{t(locale, "bag.enter.hint")}</p>

      <div className="flex min-h-11 items-start gap-3">
        <input
          id="input-check-links"
          type="checkbox"
          checked={checkLinks}
          onChange={(e) => onCheckLinksChange?.(e.target.checked)}
          aria-describedby="input-check-links-hint"
          className={`h-11 w-11 shrink-0 ${FOCUS_RING}`}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="input-check-links" className={`th-hand text-xl ${TEXT}`}>
            {t(locale, "reputation.consent.label")}
          </label>
          <p id="input-check-links-hint" className="text-base text-[color:var(--th-muted)]">
            {t(locale, "reputation.consent.text")}
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-6 pt-2">
        <button
          type="submit"
          disabled={!confirmable || busy}
          aria-describedby={!confirmable ? "bag-need-one" : undefined}
          className={`th-seal ${FOCUS_RING}`}
        >
          {t(locale, "input.submit")}
        </button>
        <button type="button" onClick={onClose} className={`th-text-button ${FOCUS_RING}`}>
          {t(locale, "bag.close")}
        </button>
      </div>
    </form>
  );
}

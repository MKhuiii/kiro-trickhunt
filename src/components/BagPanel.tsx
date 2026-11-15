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
import { BUTTON_PRIMARY, BUTTON_SECONDARY, FOCUS_RING } from "./styles";

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

const TEXT_COLOR = "text-[color:var(--th-parchment-text)]";
const FIELD_BORDER = "border-2 border-[var(--th-parchment-border)]";

export function BagPanel({
  locale,
  slots,
  text,
  file,
  busy = false,
  headingRef,
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

  const toggle = (slot: BagSlot, labelKey: "bag.text.label" | "bag.image.label"): ReactElement => {
    const on = slots[slot];
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => onToggle(slot)}
        className={`min-h-11 rounded-xl ${FIELD_BORDER} px-4 py-2 text-base font-semibold ${TEXT_COLOR} ${
          on ? "ring-4 ring-inset ring-[var(--th-parchment-border)]" : ""
        } bg-[var(--th-parchment)] ${FOCUS_RING}`}
      >
        <span>{t(locale, labelKey)}</span>
        {": "}
        <span>{t(locale, on ? "bag.slot.on" : "bag.slot.off")}</span>
      </button>
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleFormKeyDown}
      className={`min-h-0 space-y-5 overflow-y-auto rounded-xl ${FIELD_BORDER} bg-[var(--th-parchment)] p-4 ${TEXT_COLOR}`}
    >
      <h2
        ref={setHeading}
        tabIndex={-1}
        className={`text-2xl font-bold ${TEXT_COLOR} ${FOCUS_RING}`}
      >
        {t(locale, "bag.heading")}
      </h2>

      <div className="flex flex-wrap gap-3">
        {toggle("text", "bag.text.label")}
        {toggle("image", "bag.image.label")}
      </div>

      {slots.text ? (
        <div className="space-y-2">
          <label htmlFor="input-text" className={`block text-xl font-semibold ${TEXT_COLOR}`}>
            {t(locale, "input.text.label")}
          </label>
          <textarea
            id="input-text"
            rows={6}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={handleTextKeyDown}
            aria-describedby="input-text-hint"
            className={`min-h-11 w-full rounded-xl ${FIELD_BORDER} bg-[var(--th-parchment)] p-3 text-lg ${TEXT_COLOR} ${FOCUS_RING}`}
          />
          <p id="input-text-hint" className={`text-base ${TEXT_COLOR}`}>
            {t(locale, "input.text.hint")}
          </p>
        </div>
      ) : null}

      {slots.image ? (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="space-y-2 rounded-xl border-2 border-dashed border-[var(--th-parchment-border)] bg-[var(--th-parchment)] p-4"
        >
          <label htmlFor="input-image" className={`block text-xl font-semibold ${TEXT_COLOR}`}>
            {t(locale, "input.image.label")}
          </label>
          <input
            ref={fileInputRef}
            id="input-image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handlePick}
            aria-describedby="input-image-hint"
            className={`block min-h-11 w-full text-base ${TEXT_COLOR} ${FOCUS_RING}`}
          />
          <p id="input-image-hint" className={`text-base ${TEXT_COLOR}`}>
            {t(locale, "input.image.hint")} {t(locale, "input.paste.hint")}
          </p>
          {file !== null ? (
            <p className={`flex flex-wrap items-center gap-3 text-base ${TEXT_COLOR}`}>
              <span>{t(locale, "input.image.selected")}</span>
              <button
                type="button"
                onClick={() => onFileChange(null)}
                className={`min-h-11 ${BUTTON_SECONDARY}`}
              >
                {t(locale, "input.image.remove")}
              </button>
            </p>
          ) : null}
        </div>
      ) : null}

      {!confirmable ? (
        <p id="bag-need-one" className={`text-base ${TEXT_COLOR}`}>
          {t(locale, "bag.needOne")}
        </p>
      ) : null}
      <p className={`text-base ${TEXT_COLOR}`}>{t(locale, "bag.enter.hint")}</p>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={!confirmable || busy}
          aria-describedby={!confirmable ? "bag-need-one" : undefined}
          className={`min-h-11 ${BUTTON_PRIMARY}`}
        >
          {t(locale, "input.submit")}
        </button>
        <button type="button" onClick={onClose} className={`min-h-11 ${BUTTON_SECONDARY}`}>
          {t(locale, "bag.close")}
        </button>
      </div>
    </form>
  );
}

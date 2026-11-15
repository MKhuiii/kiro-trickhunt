import { useEffect, useRef } from "react";
import type { ChangeEvent, DragEvent, FormEvent, ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, FOCUS_RING } from "./styles";

interface InputFormProps {
  readonly locale: Locale;
  readonly text: string;
  readonly file: File | null;
  readonly working: boolean;
  readonly showReset: boolean;
  readonly onTextChange: (text: string) => void;
  readonly onFile: (file: File | null) => void;
  readonly onSubmit: () => void;
  readonly onReset: () => void;
}

export function firstImage(files: FileList | readonly File[] | null | undefined): File | null {
  if (!files) return null;
  for (const file of Array.from(files)) {
    if (file.type.startsWith("image/")) return file;
  }
  return null;
}

export function InputForm({
  locale,
  text,
  file,
  working,
  showReset,
  onTextChange,
  onFile,
  onSubmit,
  onReset,
}: InputFormProps): ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // A file input cannot be controlled; clear it when the image is removed.
  useEffect(() => {
    if (file === null && fileInputRef.current) fileInputRef.current.value = "";
  }, [file]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!working) onSubmit();
  };
  const handlePick = (event: ChangeEvent<HTMLInputElement>): void => {
    onFile(firstImage(event.target.files));
  };
  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const dropped = firstImage(event.dataTransfer.files);
    if (dropped) onFile(dropped);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="input-text"
          className="block text-xl font-semibold text-[color:var(--th-text)]"
        >
          {t(locale, "input.text.label")}
        </label>
        <textarea
          id="input-text"
          rows={6}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          aria-describedby="input-text-hint"
          className={`w-full rounded-xl border-2 border-[var(--th-border)] bg-[var(--th-surface)] p-3 text-lg text-[color:var(--th-text)] ${FOCUS_RING}`}
        />
        <p id="input-text-hint" className="text-base text-[color:var(--th-muted)]">
          {t(locale, "input.text.hint")}
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="space-y-2 rounded-xl border-2 border-dashed border-[var(--th-border)] bg-[var(--th-surface)] p-4"
      >
        <label
          htmlFor="input-image"
          className="block text-xl font-semibold text-[color:var(--th-text)]"
        >
          {t(locale, "input.image.label")}
        </label>
        <input
          ref={fileInputRef}
          id="input-image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handlePick}
          aria-describedby="input-image-hint"
          className={`block w-full text-base text-[color:var(--th-text)] ${FOCUS_RING}`}
        />
        <p id="input-image-hint" className="text-base text-[color:var(--th-muted)]">
          {t(locale, "input.image.hint")} {t(locale, "input.paste.hint")}
        </p>
        {file !== null ? (
          <p className="flex flex-wrap items-center gap-3 text-base text-[color:var(--th-text)]">
            <span>{t(locale, "input.image.selected")}</span>
            <button type="button" onClick={() => onFile(null)} className={BUTTON_SECONDARY}>
              {t(locale, "input.image.remove")}
            </button>
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={working} className={BUTTON_PRIMARY}>
          {t(locale, "input.submit")}
        </button>
        {showReset ? (
          <button type="button" onClick={onReset} className={BUTTON_SECONDARY}>
            {t(locale, "input.reset")}
          </button>
        ) : null}
      </div>
    </form>
  );
}

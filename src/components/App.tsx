"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import { analyzeRequest } from "../client/ingest/analyze-client";
import { buildAnalyzeRequest } from "../client/ingest/analyze-input";
import type { IngestDeps } from "../client/ingest";
import type { Locale, Verdict } from "../pipeline";
import {
  HIGH_CONTRAST_PALETTE,
  NORMAL_PALETTE,
  aiUnavailable,
  buildResultView,
  getBrowserStorage,
  loadPreferences,
  paletteToCssVars,
  runCheck,
  savePreference,
  t,
} from "../ui";
import type {
  CheckDeps,
  CheckStatus,
  MessageKey,
  MessageRef,
  Preferences,
  ResultExtras,
} from "../ui";
import { ErrorAlert } from "./ErrorAlert";
import { Header } from "./Header";
import { AiNote } from "./AiNote";
import { InputForm, firstImage } from "./InputForm";
import { ResultPanel } from "./ResultPanel";
import { StatusRegion } from "./StatusRegion";
import type { PreferenceChange } from "./SettingsPanel";
import { FOCUS_RING } from "./styles";

type PageState =
  | { readonly kind: "idle"; readonly hint: MessageKey | null }
  | { readonly kind: "working"; readonly status: CheckStatus; readonly percent?: number }
  | {
      readonly kind: "done";
      readonly verdict: Verdict;
      readonly inputText: string;
      readonly extras: ResultExtras;
    }
  | { readonly kind: "failed"; readonly message: MessageRef };

const WITHHELD_AI_NOTE = {
  headingKey: "result.aiNote.heading",
  textKey: "result.aiNote.unavailable",
} as const;

const STATUS_KEYS: Readonly<Record<CheckStatus, MessageKey>> = {
  preparing: "progress.preparing",
  qr: "progress.qr",
  "ocr-loading": "progress.ocr.loading",
  "ocr-recognizing": "progress.ocr.recognizing",
  sending: "progress.sending",
};

export function App(): ReactElement {
  // First render uses defaults so server and client markup match.
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences(null));
  const [state, setState] = useState<PageState>({ kind: "idle", hint: null });
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ingestDepsRef = useRef<IngestDeps | null>(null);

  const locale: Locale = prefs.language;

  // Load saved preferences after mount.
  useEffect(() => {
    setPrefs(loadPreferences(getBrowserStorage()));
  }, []);

  // Text size, motion and contrast on the document root.
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${prefs.textSize}%`;
    root.dataset.reduceMotion = String(prefs.reduceMotion);
    root.dataset.highContrast = String(prefs.highContrast);
    root.lang = prefs.language;
  }, [prefs]);

  // Paste an image anywhere on the page.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      const pasted = firstImage(event.clipboardData?.files);
      if (pasted) setFile(pasted);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  // Move focus to the result heading when a result is ready.
  useEffect(() => {
    if (state.kind === "done") headingRef.current?.focus();
  }, [state.kind]);

  const updatePref: PreferenceChange = (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    savePreference(getBrowserStorage(), key, value);
  };

  const submit = (): void => {
    const deps: CheckDeps = {
      ingestImage: async (picked, onProgress) => {
        // Loaded only when an image was chosen, so the OCR and QR code stay out of the first load.
        const [{ createBrowserIngestDeps }, { ingestImage }] = await Promise.all([
          import("../client/ingest/browser-deps"),
          import("../client/ingest/ingest-image"),
        ]);
        ingestDepsRef.current ??= createBrowserIngestDeps();
        return ingestImage(picked, ingestDepsRef.current, { onProgress });
      },
      buildAnalyzeRequest,
      analyzeRequest,
    };
    const hasInput = text.trim() !== "" || file !== null;
    setState({ kind: "working", status: "preparing" });
    void runCheck(deps, { userText: text, file, locale }, (status, percent) => {
      setState({ kind: "working", status, percent });
    }).then((outcome) => {
      if (outcome.kind === "nothing") {
        setState({ kind: "idle", hint: hasInput ? "progress.nothing" : "input.empty" });
      } else if (outcome.kind === "failed") {
        setState({ kind: "failed", message: outcome.message });
      } else {
        setState({
          kind: "done",
          verdict: outcome.verdict,
          inputText: outcome.inputText,
          extras: outcome.extras,
        });
      }
    });
  };

  const reset = (): void => {
    setText("");
    setFile(null);
    setState({ kind: "idle", hint: null });
  };

  const view = useMemo(
    () =>
      state.kind === "done"
        ? buildResultView(state.verdict, state.inputText, locale, state.extras)
        : null,
    [state, locale],
  );

  const cssVars = paletteToCssVars(prefs.highContrast ? HIGH_CONTRAST_PALETTE : NORMAL_PALETTE);

  let statusKey: MessageKey | null = null;
  let statusParams: Record<string, string | number> | undefined;
  if (state.kind === "idle") statusKey = state.hint;
  else if (state.kind === "working") {
    statusKey = STATUS_KEYS[state.status];
    if (state.status === "ocr-recognizing") {
      statusParams = { percent: Math.round((state.percent ?? 0) * 100) };
    }
  } else if (state.kind === "done") statusKey = "progress.done";

  const showWithheldAiNote =
    state.kind === "done" &&
    view?.kind === "withheld" &&
    aiUnavailable(state.verdict.semantic?.status, state.extras.semanticMode);

  return (
    <div
      style={cssVars as CSSProperties}
      className="min-h-screen bg-[var(--th-bg)] text-[color:var(--th-text)]"
    >
      <a
        href="#main"
        className={`sr-only focus:not-sr-only focus:block focus:bg-[var(--th-accent)] focus:p-3 focus:text-[color:var(--th-on-accent)] ${FOCUS_RING}`}
      >
        {t(locale, "a11y.skip")}
      </a>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <Header prefs={prefs} locale={locale} onChange={updatePref} />
        <main id="main" className="space-y-8">
          <p className="rounded-xl border-2 border-[var(--th-border)] bg-[var(--th-surface)] p-4 text-base text-[color:var(--th-text)]">
            {t(locale, "privacy.note")}
          </p>
          <InputForm
            locale={locale}
            text={text}
            file={file}
            working={state.kind === "working"}
            showReset={state.kind === "done"}
            onTextChange={setText}
            onFile={setFile}
            onSubmit={submit}
            onReset={reset}
          />
          <StatusRegion locale={locale} messageKey={statusKey} params={statusParams} />
          {state.kind === "failed" ? <ErrorAlert message={state.message} locale={locale} /> : null}
          {view !== null ? (
            <section className="space-y-6">
              {showWithheldAiNote ? <AiNote aiNote={WITHHELD_AI_NOTE} locale={locale} /> : null}
              <ResultPanel view={view} locale={locale} headingRef={headingRef} />
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}

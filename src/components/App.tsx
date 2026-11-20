"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
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
  canConfirm,
  getBrowserStorage,
  loadPreferences,
  paletteToCssVars,
  flowReducer,
  legFor,
  MIN_HUNT_MS,
  revealWaitMs,
  runCheck,
  sceneFor,
  savePreference,
  t,
} from "../ui";
import type {
  CheckDeps,
  CheckStatus,
  FlowState,
  FlowStep,
  MessageKey,
  MessageRef,
  Preferences,
  ResultExtras,
} from "../ui";
import { ErrorAlert } from "./ErrorAlert";
import { Frame } from "./Frame";
import { TopControls } from "./TopControls";
import { Art } from "./art/registry";
import { HunterButton } from "./HunterButton";
import { AiNote } from "./AiNote";
import { BagPanel, firstImage } from "./BagPanel";
import { HuntScene } from "./HuntScene";
import { JournalSheet } from "./JournalSheet";
import { LostScene } from "./LostScene";
import { MonsterStage } from "./MonsterStage";
import { PixiStage } from "./stage/PixiStage";
import { useAmbientSound } from "./audio/useAmbientSound";
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

const TICK_MS = 250;

function systemPrefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

const INITIAL_FLOW: FlowState = { step: "home", slots: { text: true, image: false } };

export function App(): ReactElement {
  const [flow, dispatch] = useReducer(flowReducer, INITIAL_FLOW);
  const hunterRef = useRef<HTMLButtonElement>(null);
  // First render uses defaults so server and client markup match.
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences(null));
  const [state, setState] = useState<PageState>({ kind: "idle", hint: null });
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ingestDepsRef = useRef<IngestDeps | null>(null);
  const startedAtRef = useRef(0);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runIdRef = useRef(0);
  const hasImageRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const locale: Locale = prefs.language;

  // Optional ambient sound: off by default, made only after the first pointer or key press.
  useAmbientSound(flow.step, prefs.sound);

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

  // While the bag is open, a pasted image switches the Picture compartment on.
  const bagOpen = flow.step === "bag";
  const imageOn = flow.slots.image;
  useEffect(() => {
    if (!bagOpen) return;
    const onPaste = (event: ClipboardEvent): void => {
      const pasted = firstImage(event.clipboardData?.files);
      if (!pasted) return;
      if (!imageOn) dispatch({ kind: "toggle", slot: "image" });
      setFile(pasted);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [bagOpen, imageOn]);

  reducedMotionRef.current = prefs.reduceMotion || systemPrefersReducedMotion();

  const clearRevealTimer = (): void => {
    if (revealTimerRef.current !== null) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  };

  // Re-render every tick while hunting; the interval is cleared on leaving the step and on unmount.
  const hunting = flow.step === "hunting";
  useEffect(() => {
    if (!hunting) return;
    const id = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), TICK_MS);
    return () => clearInterval(id);
  }, [hunting]);

  // Invalidate any pending check and reveal timer on unmount.
  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      clearRevealTimer();
    };
  }, []);

  // Move focus to the result heading when a result is ready.
  useEffect(() => {
    if (state.kind === "done") headingRef.current?.focus();
  }, [state.kind]);

  // Return focus to the hunter button whenever the flow comes back home. Not on the first
  // load, so no focus outline is drawn around the hunter before the user does anything.
  const firstFlowRef = useRef(true);
  useEffect(() => {
    if (firstFlowRef.current) {
      firstFlowRef.current = false;
      return;
    }
    if (flow.step === "home") hunterRef.current?.focus();
  }, [flow.step]);

  const updatePref: PreferenceChange = (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    savePreference(getBrowserStorage(), key, value);
  };

  const submit = (): void => {
    if (flow.step !== "bag") return;
    const userText = flow.slots.text ? text : "";
    const pickedFile = flow.slots.image ? file : null;
    if (!canConfirm(flow.slots, text, file)) return;
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
    clearRevealTimer();
    runIdRef.current += 1;
    const runId = runIdRef.current;
    startedAtRef.current = Date.now();
    hasImageRef.current = pickedFile !== null;
    setElapsedMs(0);
    setState({ kind: "working", status: "preparing" });
    dispatch({ kind: "confirm", canConfirm: true });
    void runCheck(deps, { userText, file: pickedFile, locale, checkLinks: true }, (status, percent) => {
      if (runIdRef.current !== runId) return;
      setState({ kind: "working", status, percent });
    }).then((outcome) => {
      if (runIdRef.current !== runId) return;
      const wait = revealWaitMs({
        elapsedMs: Date.now() - startedAtRef.current,
        minMs: MIN_HUNT_MS,
        reducedMotion: reducedMotionRef.current,
      });
      revealTimerRef.current = setTimeout(() => {
        revealTimerRef.current = null;
        if (runIdRef.current !== runId) return;
        if (outcome.kind === "nothing") {
          // The flow cannot go back from hunting to the bag, so this counts as a failed hunt.
          dispatch({ kind: "fail" });
          setState({ kind: "idle", hint: "progress.nothing" });
        } else if (outcome.kind === "failed") {
          dispatch({ kind: "fail" });
          setState({ kind: "failed", message: outcome.message });
        } else {
          const outcomeView = buildResultView(
            outcome.verdict,
            outcome.inputText,
            locale,
            outcome.extras,
          );
          // A withheld view has no monster to reveal, so the hunt is lost (REQ-HUNT-10).
          dispatch(outcomeView.kind === "withheld" ? { kind: "fail" } : { kind: "ready" });
          setState({
            kind: "done",
            verdict: outcome.verdict,
            inputText: outcome.inputText,
            extras: outcome.extras,
          });
        }
      }, wait);
    });
  };

  const reset = (): void => {
    runIdRef.current += 1;
    clearRevealTimer();
    hasImageRef.current = false;
    setElapsedMs(0);
    setText("");
    setFile(null);
    // Dropping the verdict also drops its input text and extras.
    setState({ kind: "idle", hint: null });
    dispatch({ kind: "again" });
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

  const scene = sceneFor({ step: flow.step === "bag" ? "bag" : "home" });
  const step: FlowStep = flow.step === "home" || flow.step === "bag" ? scene.phase : flow.step;

  // The leg of the hunt, and the key that tells the canvas which drawings are on the page.
  const huntLeg =
    flow.step === "hunting"
      ? legFor({
          hasImage: hasImageRef.current,
          status: state.kind === "working" ? state.status : "sending",
          elapsedMs,
          minMs: MIN_HUNT_MS,
        })
      : null;
  const actorKey =
    huntLeg ?? (flow.step === "revealed" && view?.kind === "ready" ? view.monster.id : "");

  return (
    <div style={cssVars as CSSProperties}>
      <a
        href="#main"
        className={`sr-only focus:not-sr-only focus:block focus:bg-[var(--th-accent)] focus:p-3 focus:text-[color:var(--th-on-accent)] ${FOCUS_RING}`}
      >
        {t(locale, "a11y.skip")}
      </a>
      <Frame
        step={step}
        controls={<TopControls prefs={prefs} locale={locale} onChange={updatePref} />}
        stage={
          <PixiStage
            phase={flow.step}
            reduceMotion={reducedMotionRef.current}
            highContrast={prefs.highContrast}
            actorKey={actorKey}
          />
        }
      >
        {flow.step !== "home" ? <h1 className="sr-only">{t(locale, "app.name")}</h1> : null}
        {flow.step === "home" ? (
          <div className="relative min-h-0 flex-1">
            <Art id="backdrop-home" className="absolute inset-0 h-full w-full" />
            <div className="relative flex h-full flex-col items-center overflow-x-hidden overflow-y-auto px-4 pb-4 pt-[3.75rem]">
              <HunterButton
                ref={hunterRef}
                locale={locale}
                captionKey={scene.captionKey}
                onOpen={() => dispatch({ kind: "open-bag" })}
              />
            </div>
          </div>
        ) : flow.step === "bag" ? (
          <div className="relative min-h-0 flex-1">
            <Art id="backdrop-home" className="absolute inset-0 h-full w-full opacity-40" />
            <div className="relative flex h-full flex-col items-center gap-4 overflow-hidden px-4 pb-4 pt-[3.75rem] md:flex-row md:items-center">
              <div className="hidden h-[11dvh] w-[11dvh] shrink-0 md:block [@media(min-height:52rem)]:block md:aspect-square md:h-auto md:max-h-full md:w-[28%] md:max-w-none">
                <Art id="hunter" pose="idle" className="h-full w-full" />
              </div>
              <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2 md:max-h-full">
                <BagPanel
                  locale={locale}
                  slots={flow.slots}
                  text={text}
                  file={file}
                  busy={state.kind === "working"}
                  onToggle={(slot) => dispatch({ kind: "toggle", slot })}
                  onTextChange={setText}
                  onFileChange={setFile}
                  onConfirm={submit}
                  onClose={() => dispatch({ kind: "close-bag" })}
                />
                <StatusRegion locale={locale} messageKey={statusKey} params={statusParams} />
              </div>
            </div>
          </div>
        ) : flow.step === "hunting" ? (
          <HuntScene locale={locale} leg={huntLeg ?? "forest"}>
            <StatusRegion locale={locale} messageKey={statusKey} params={statusParams} />
          </HuntScene>
        ) : flow.step === "lost" ? (
          <LostScene locale={locale} onAgain={reset}>
            <StatusRegion locale={locale} messageKey={statusKey} params={statusParams} />
            {state.kind === "failed" ? <ErrorAlert message={state.message} locale={locale} /> : null}
            {view !== null && view.kind === "withheld" ? (
              <section className="space-y-4">
                {showWithheldAiNote ? <AiNote aiNote={WITHHELD_AI_NOTE} locale={locale} /> : null}
                <ResultPanel view={view} locale={locale} headingRef={headingRef} />
              </section>
            ) : null}
          </LostScene>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col md:flex-row [@media(max-height:32rem)]:flex-row">
            <div className="min-h-0 min-w-0 shrink-0 basis-[26dvh] md:flex-1 md:basis-0 [@media(max-height:32rem)]:flex-1 [@media(max-height:32rem)]:basis-0">
              {view !== null && view.kind === "ready" ? (
                <MonsterStage locale={locale} monster={view.monster.id} linkCreatures={view.linkCreatures} />
              ) : null}
            </div>
            {view !== null ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col md:pt-[3.75rem]">
                <JournalSheet view={view} locale={locale} headingRef={headingRef} onAgain={reset}>
                  <StatusRegion locale={locale} messageKey={statusKey} params={statusParams} />
                </JournalSheet>
              </div>
            ) : null}
          </div>
        )}
      </Frame>
    </div>
  );
}

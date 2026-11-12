// TEMPORARY developer page for checking the client ingest flow in a real
// browser. To be replaced by the real UI. Not linked from any other page.
"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  analyzeRequest,
  buildAnalyzeRequest,
  createBrowserIngestDeps,
  ingestImage,
} from "../../client/ingest";
import type { IngestDeps, IngestResult, OcrProgress } from "../../client/ingest";

function firstImage(files: FileList | readonly File[] | null | undefined): File | null {
  if (!files) return null;
  for (const file of Array.from(files)) {
    if (file.type.startsWith("image/")) return file;
  }
  return null;
}

function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? "undefined";
}

export default function TryPage() {
  const depsRef = useRef<IngestDeps | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("Idle");
  const [ingest, setIngest] = useState<IngestResult | null>(null);
  const [buildNotices, setBuildNotices] = useState<unknown>(null);
  const [analyzeResult, setAnalyzeResult] = useState<unknown>(null);

  // Document-level paste: take the first image only.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      const pasted = firstImage(event.clipboardData?.files);
      if (pasted) setFile(pasted);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  const onPick = (event: ChangeEvent<HTMLInputElement>): void => {
    setFile(firstImage(event.target.files));
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const dropped = firstImage(event.dataTransfer.files);
    if (dropped) setFile(dropped);
  };

  const run = async (): Promise<void> => {
    setRunning(true);
    setIngest(null);
    setBuildNotices(null);
    setAnalyzeResult(null);
    setProgress("Starting");
    try {
      let ingested: IngestResult | null = null;
      if (file) {
        depsRef.current ??= createBrowserIngestDeps();
        ingested = await ingestImage(file, depsRef.current, {
          onProgress: (p: OcrProgress) =>
            setProgress(`OCR ${p.stage}: ${Math.round(p.progress * 100)}%`),
        });
        setIngest(ingested);
      }
      const built = buildAnalyzeRequest({
        userText: text,
        ocrText: ingested?.ocrText,
        qrResults: ingested?.qrResults,
      });
      setBuildNotices(built.notices);
      if (built.request !== null) {
        setProgress("Sending to /api/analyze");
        setAnalyzeResult(await analyzeRequest(built.request));
        setProgress("Done");
      } else {
        setProgress("Nothing to analyze");
      }
    } catch {
      setProgress("Unexpected error");
    } finally {
      setRunning(false);
    }
  };

  const qrSummary = ingest
    ? ingest.qrResults.map((q) => (q.kind === "url" ? { kind: q.kind, url: q.url } : { kind: q.kind }))
    : null;

  return (
    <main>
      <h1>Ingest try page (temporary)</h1>

      <p>
        <label htmlFor="try-file">Image file</label>{" "}
        <input id="try-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={onPick} />
      </p>

      <div onDragOver={onDragOver} onDrop={onDrop}>
        <p>Drop an image here, or paste one anywhere on this page.</p>
        <p>Selected image: {file ? "yes" : "none"}</p>
      </div>

      <p>
        <label htmlFor="try-text">Message text</label>
      </p>
      <textarea id="try-text" rows={6} cols={60} value={text} onChange={(e) => setText(e.target.value)} />

      <p>
        <button type="button" onClick={() => void run()} disabled={running}>
          Check
        </button>
      </p>

      <div role="status" aria-live="polite">
        {progress}
      </div>

      <h2>OCR text</h2>
      <pre>{ingest ? (ingest.ocrText ?? "") : ""}</pre>

      <h2>QR results</h2>
      <pre>{qrSummary ? toJson(qrSummary) : ""}</pre>

      <h2>Notices</h2>
      <pre>{ingest || buildNotices ? toJson({ ingest: ingest?.notices ?? [], build: buildNotices ?? [] }) : ""}</pre>

      <h2>Error code</h2>
      <pre>{ingest?.errorCode ?? ""}</pre>

      <h2>Result</h2>
      <pre>{analyzeResult ? toJson(analyzeResult) : ""}</pre>
    </main>
  );
}

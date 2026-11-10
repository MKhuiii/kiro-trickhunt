import { z } from "zod";
import type { LlmClient, LlmRequest } from "../../analyzers/llm-client";
import { LlmClientError } from "./llm-client-error";
import type { LlmConfig } from "./llm-config";

const ResponseSchema = z.object({
  choices: z.array(z.unknown()).min(1),
});

const ChoiceSchema = z.object({
  message: z.object({ content: z.string() }),
});

/**
 * LlmClient for any OpenAI-compatible Chat Completions endpoint.
 * `fetchImpl` is injected; no module state, retries, caching or logging.
 * Every failure is a LlmClientError carrying only a fixed code.
 */
export function createOpenAiCompatibleClient(
  config: LlmConfig,
  fetchImpl: typeof fetch,
): LlmClient {
  const url = `${config.baseUrl}/chat/completions`;

  return {
    async complete(request: LlmRequest): Promise<string> {
      const callerSignal = request.signal;
      if (callerSignal?.aborted) {
        throw new LlmClientError("network");
      }

      const controller = new AbortController();
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, config.timeoutMs);

      const onCallerAbort = (): void => {
        controller.abort();
      };
      callerSignal?.addEventListener("abort", onCallerAbort, { once: true });

      // Rejects when the internal controller aborts, so a fetch that ignores
      // the signal can never leave `complete` hanging.
      let onInternalAbort: (() => void) | undefined;
      const aborted = new Promise<never>((_, reject) => {
        onInternalAbort = (): void => {
          reject(new LlmClientError(timedOut ? "timeout" : "network"));
        };
        controller.signal.addEventListener("abort", onInternalAbort, {
          once: true,
        });
      });
      aborted.catch(() => undefined);

      const run = async (): Promise<string> => {
        try {
          const body = JSON.stringify({
            model: config.model,
            messages: [
              { role: "system", content: request.system },
              { role: "user", content: request.user },
            ],
            temperature: 0,
            max_tokens: config.maxOutputTokens,
            stream: false,
          });

          const res = await fetchImpl(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${config.apiKey}`,
            },
            body,
            signal: controller.signal,
          });

          if (!res.ok) {
            throw new LlmClientError("http-status");
          }

          let raw: string;
          try {
            raw = await res.text();
          } catch {
            throw new LlmClientError("network");
          }

          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            throw new LlmClientError("bad-shape");
          }

          const outer = ResponseSchema.safeParse(parsed);
          if (!outer.success) {
            throw new LlmClientError("bad-shape");
          }
          const choice = ChoiceSchema.safeParse(outer.data.choices[0]);
          if (!choice.success) {
            throw new LlmClientError("bad-shape");
          }
          const text = choice.data.message.content.trim();
          if (text.length === 0) {
            throw new LlmClientError("bad-shape");
          }
          return text;
        } catch (caught: unknown) {
          if (caught instanceof LlmClientError) {
            throw caught;
          }
          throw new LlmClientError(timedOut ? "timeout" : "network");
        }
      };

      const work = run();
      work.catch(() => undefined);

      try {
        return await Promise.race([work, aborted]);
      } catch (caught: unknown) {
        if (caught instanceof LlmClientError) {
          throw caught;
        }
        throw new LlmClientError(timedOut ? "timeout" : "network");
      } finally {
        clearTimeout(timer);
        callerSignal?.removeEventListener("abort", onCallerAbort);
        if (onInternalAbort) {
          controller.signal.removeEventListener("abort", onInternalAbort);
        }
      }
    },
  };
}

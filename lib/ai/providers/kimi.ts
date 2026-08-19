import type { AiCompletionOptions, AiMessage, AiProvider } from '../provider';

/**
 * Kimi (Moonshot AI) provider. Moonshot exposes an OpenAI-compatible Chat
 * Completions API, so this is a plain fetch() call — no vendor SDK
 * dependency, which keeps the app easy to move to a different provider or a
 * self-hosted model endpoint later (Section: "architecture designed to
 * support additional/self-hosted LLMs later").
 *
 * Prompt caching:
 * The system message passed in is expected to already be a *stable, cached
 * prefix* built by lib/ai/cache.ts (the business context block). Sending an
 * identical system-message prefix across consecutive requests lets
 * Moonshot's own inference stack reuse cached attention state for that
 * prefix on their side, in addition to us avoiding rebuilding it on ours —
 * so the same message list shape should be kept stable call to call rather
 * than reformatted per request.
 */
export class KimiProvider implements AiProvider {
  readonly name = 'kimi';

  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'KIMI_API_KEY is not set. Add it to your environment variables (see .env.example).'
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = (process.env.KIMI_API_BASE_URL || 'https://api.moonshot.ai/v1').replace(/\/$/, '');
    this.model = process.env.KIMI_MODEL || 'moonshot-v1-32k';
  }

  async complete(messages: AiMessage[], options: AiCompletionOptions = {}): Promise<string> {
    const { maxTokens = 1024, temperature = 0.4, jsonMode = false } = options;

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      max_tokens: maxTokens,
      temperature,
    };

    if (jsonMode) {
      // Moonshot's OpenAI-compatible endpoint supports response_format for
      // JSON-only output on supported models.
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      // Route-handler level timeout guard; Next.js/Vercel also enforces its
      // own function timeout on top of this.
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Kimi API request failed (${response.status} ${response.statusText}): ${errorText.slice(0, 500)}`
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || content.length === 0) {
      throw new Error('Kimi API returned an empty response.');
    }

    return content;
  }
}

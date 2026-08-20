// ==============================================================================
// AI provider abstraction
//
// Nothing in the app talks to Kimi (or any model) directly. Everything goes
// through this interface, selected at runtime by the AI_PROVIDER env var.
// To add another provider later (self-hosted model, OpenAI, Anthropic,
// etc.) drop a new file in lib/ai/providers/ that implements AiProvider and
// register it in the switch below — no other file in the app changes.
// ==============================================================================

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionOptions {
  /** Approximate max tokens for the response. */
  maxTokens?: number;
  /** 0–1, lower = more deterministic. Defaults are tuned per call site. */
  temperature?: number;
  /**
   * When true, the provider should return structured JSON only (no prose,
   * no markdown fences). Used for stage detection / structured suggestions.
   */
  jsonMode?: boolean;
}

export interface AiProvider {
  readonly name: string;
  complete(messages: AiMessage[], options?: AiCompletionOptions): Promise<string>;
}

let cachedProvider: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (cachedProvider) return cachedProvider;

  const providerName = (process.env.AI_PROVIDER || 'kimi').toLowerCase();

  switch (providerName) {
    case 'kimi': {
      const { KimiProvider } = require('./providers/kimi') as typeof import('./providers/kimi');
      cachedProvider = new KimiProvider();
      break;
    }
    default:
      throw new Error(
        `Unknown AI_PROVIDER "${providerName}". Add a matching file under lib/ai/providers/ ` +
          `and register it in lib/ai/provider.ts, or set AI_PROVIDER=kimi.`
      );
  }

  return cachedProvider!;
}

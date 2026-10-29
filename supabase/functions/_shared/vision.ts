// Pluggable vision/text model for the scanner and single-word lookup.
//
// The app never names a model. The server chooses it from three settings, so any model that
// can read an image and return JSON can be used:
//
//   SCAN_PROVIDER   anthropic | openai_compatible
//   SCAN_MODEL      the model ID, exactly as the provider names it
//   SCAN_API_KEY    the provider key (ANTHROPIC_API_KEY is accepted for anthropic)
//   SCAN_BASE_URL   openai_compatible only. Defaults to https://api.openai.com/v1.
//                   Works with any server that speaks the OpenAI chat-completions API
//                   (OpenAI, OpenRouter, Google's OpenAI-compatible endpoint, Ollama, vLLM).
//
// Every provider is called with the same JSON Schema and returns the same parsed object, so
// nothing downstream knows which one answered.

export type JsonSchema = Record<string, unknown>;

export interface ReadRequest {
  system: string;
  prompt: string;
  /** Optional page photo. Omitted for a single-word lookup. */
  image?: { base64: string; mediaType: 'image/jpeg' | 'image/png' };
  schemaName: string;
  schema: JsonSchema;
  maxTokens: number;
}

export interface VisionProvider {
  readonly name: string;
  read(req: ReadRequest): Promise<unknown>;
}

export class ProviderError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ── Anthropic Messages API ───────────────────────────────────────────────────

class AnthropicProvider implements VisionProvider {
  readonly name = 'anthropic';
  constructor(private apiKey: string, private model: string) {}

  async read(req: ReadRequest): Promise<unknown> {
    const content: unknown[] = [];
    if (req.image) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: req.image.mediaType, data: req.image.base64 },
      });
    }
    content.push({ type: 'text', text: req.prompt });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens,
        system: req.system,
        messages: [{ role: 'user', content }],
        output_config: { format: { type: 'json_schema', schema: req.schema } },
      }),
    });
    if (!res.ok) throw new ProviderError(res.status, await res.text());

    const body = await res.json() as { content: Array<{ type: string; text?: string }> };
    const text = body.content.find((b) => b.type === 'text')?.text;
    if (!text) throw new ProviderError(502, 'no text in reply');
    return JSON.parse(text);
  }
}

// ── OpenAI-compatible chat completions ───────────────────────────────────────

class OpenAICompatibleProvider implements VisionProvider {
  readonly name = 'openai_compatible';
  constructor(private apiKey: string, private model: string, private baseUrl: string) {}

  async read(req: ReadRequest): Promise<unknown> {
    const userContent: unknown[] = [{ type: 'text', text: req.prompt }];
    if (req.image) {
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${req.image.mediaType};base64,${req.image.base64}` },
      });
    }

    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: userContent },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: req.schemaName, schema: req.schema, strict: true },
        },
      }),
    });
    if (!res.ok) throw new ProviderError(res.status, await res.text());

    const body = await res.json() as { choices: Array<{ message: { content: string | null } }> };
    const text = body.choices[0]?.message?.content;
    if (!text) throw new ProviderError(502, 'no content in reply');
    return JSON.parse(text);
  }
}

/** Builds the provider from the function's environment. Throws a readable error when it is not set up. */
export function providerFromEnv(env: (k: string) => string | undefined): VisionProvider {
  const kind = env('SCAN_PROVIDER');
  const model = env('SCAN_MODEL');
  if (!kind || !model) throw new ProviderError(500, 'model_not_configured');

  if (kind === 'anthropic') {
    const key = env('SCAN_API_KEY') ?? env('ANTHROPIC_API_KEY');
    if (!key) throw new ProviderError(500, 'model_not_configured');
    return new AnthropicProvider(key, model);
  }
  if (kind === 'openai_compatible') {
    const key = env('SCAN_API_KEY');
    if (!key) throw new ProviderError(500, 'model_not_configured');
    return new OpenAICompatibleProvider(key, model, env('SCAN_BASE_URL') ?? 'https://api.openai.com/v1');
  }
  throw new ProviderError(500, 'model_not_configured');
}

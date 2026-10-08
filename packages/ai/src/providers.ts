/**
 * LLM provider abstraction. The platform never depends on an LLM being present:
 * every AI feature has a deterministic "rules" implementation, and an LLM (when
 * configured) only enhances language understanding and copywriting. LLMs are never
 * asked for — and their output is never used as — property availability, prices
 * or ownership facts; those always come from the database.
 */
import Anthropic from "@anthropic-ai/sdk";

export interface JsonSchema {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
}

export interface GenerateOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  /** "low" for extraction / short copy, "medium" for longer reasoning */
  effort?: "low" | "medium" | "high";
}

export interface DocumentInput {
  mediaType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  base64: string;
}

export interface LLMProvider {
  readonly name: "anthropic" | "openai" | "gemini";
  generateText(opts: GenerateOptions): Promise<string>;
  generateJson<T>(opts: GenerateOptions & { schema: JsonSchema; schemaName: string }): Promise<T>;
  /** Optional: read a PDF / image (document extraction). */
  readDocument?<T>(opts: GenerateOptions & { schema: JsonSchema; schemaName: string; document: DocumentInput }): Promise<T>;
}

export class AIUnavailableError extends Error {}

/* ---------------- Anthropic (official SDK) ---------------- */

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic" as const;
  private client: Anthropic;
  constructor(private model = process.env.ANTHROPIC_MODEL || "claude-opus-5-5") {
    this.client = new Anthropic({ timeout: 60_000, maxRetries: 2 });
  }

  private async create(opts: GenerateOptions, content: Anthropic.ContentBlockParam[], schema?: JsonSchema) {
    // Server-side refusal fallback ("default" routing) keeps responses flowing if a
    // request is declined by a safety classifier.
    const params = {
      model: this.model,
      max_tokens: opts.maxTokens ?? 4000,
      system: opts.system,
      messages: [{ role: "user" as const, content }],
      output_config: { effort: opts.effort ?? "low", ...(schema ? { format: { type: "json_schema", schema } } : {}) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    };
    const response = await this.client.beta.messages.create(params as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming);
    if (response.stop_reason === "refusal") throw new AIUnavailableError("The AI provider declined this request");
    let text = "";
    for (const block of response.content) if (block.type === "text") text += block.text;
    return text;
  }

  async generateText(opts: GenerateOptions) {
    return this.create(opts, [{ type: "text", text: opts.prompt }]);
  }

  async generateJson<T>(opts: GenerateOptions & { schema: JsonSchema; schemaName: string }) {
    const text = await this.create(opts, [{ type: "text", text: opts.prompt }], opts.schema);
    return JSON.parse(text) as T;
  }

  async readDocument<T>(opts: GenerateOptions & { schema: JsonSchema; schemaName: string; document: DocumentInput }) {
    const doc: Anthropic.ContentBlockParam =
      opts.document.mediaType === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: opts.document.base64 } }
        : { type: "image", source: { type: "base64", media_type: opts.document.mediaType, data: opts.document.base64 } };
    const text = await this.create(opts, [doc, { type: "text", text: opts.prompt }], opts.schema);
    return JSON.parse(text) as T;
  }
}

/* ---------------- OpenAI (REST) ---------------- */

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai" as const;
  constructor(
    private apiKey = process.env.OPENAI_API_KEY!,
    private model = process.env.OPENAI_MODEL || "gpt-4.1-mini",
  ) {}
  private async call(opts: GenerateOptions, responseFormat?: unknown) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        max_tokens: opts.maxTokens ?? 4000,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.prompt },
        ],
        ...(responseFormat ? { response_format: responseFormat } : {}),
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new AIUnavailableError(`OpenAI error ${res.status}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message?.content ?? "";
  }
  generateText(opts: GenerateOptions) {
    return this.call(opts);
  }
  async generateJson<T>(opts: GenerateOptions & { schema: JsonSchema; schemaName: string }) {
    const text = await this.call(opts, { type: "json_schema", json_schema: { name: opts.schemaName, schema: opts.schema, strict: true } });
    return JSON.parse(text) as T;
  }
}

/* ---------------- Google Gemini (REST) ---------------- */

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini" as const;
  constructor(
    private apiKey = process.env.GEMINI_API_KEY!,
    private model = process.env.GEMINI_MODEL || "gemini-2.5-flash",
  ) {}
  private async call(opts: GenerateOptions, json?: JsonSchema) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
        generationConfig: { maxOutputTokens: opts.maxTokens ?? 4000, ...(json ? { responseMimeType: "application/json" } : {}) },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new AIUnavailableError(`Gemini error ${res.status}`);
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  }
  generateText(opts: GenerateOptions) {
    return this.call(opts);
  }
  async generateJson<T>(opts: GenerateOptions & { schema: JsonSchema; schemaName: string }) {
    const text = await this.call({ ...opts, prompt: `${opts.prompt}\n\nRespond with JSON matching this schema:\n${JSON.stringify(opts.schema)}` }, opts.schema);
    return JSON.parse(text.replace(/^```json\s*|```$/g, "")) as T;
  }
}

let cached: { key: string; provider: LLMProvider | null } | null = null;

/** Returns the configured LLM provider, or null when running rules-only. */
export function getLLM(): LLMProvider | null {
  const key = `${process.env.AI_PROVIDER}|${!!process.env.ANTHROPIC_API_KEY}|${!!process.env.OPENAI_API_KEY}|${!!process.env.GEMINI_API_KEY}`;
  if (cached?.key === key) return cached.provider;
  let provider: LLMProvider | null = null;
  switch ((process.env.AI_PROVIDER ?? "rules").toLowerCase()) {
    case "anthropic":
      provider = new AnthropicProvider();
      break;
    case "openai":
      provider = process.env.OPENAI_API_KEY ? new OpenAIProvider() : null;
      break;
    case "gemini":
      provider = process.env.GEMINI_API_KEY ? new GeminiProvider() : null;
      break;
  }
  cached = { key, provider };
  return provider;
}

export function aiProviderName(): string {
  return getLLM()?.name ?? "rules";
}

/** Run an LLM enhancement but never let it break the request. */
export async function tryLLM<T>(fn: (llm: LLMProvider) => Promise<T>): Promise<T | null> {
  const llm = getLLM();
  if (!llm) return null;
  try {
    return await fn(llm);
  } catch (e) {
    console.warn("[ai] provider call failed, falling back to rules:", (e as Error).message);
    return null;
  }
}

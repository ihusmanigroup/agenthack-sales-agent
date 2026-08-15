import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

let client: OpenAI | null = null;

export function llm(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set. Add it to your environment (see .env.example).");
  }
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export async function chat(
  prompt: string,
  system?: string,
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const r = await llm().chat.completions.create({
    model: MODEL,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 2048,
    messages: [
      {
        role: "system",
        content:
          system ??
          "You are a precise, reliable, autonomous B2B sales agent. You ground every claim in evidence and never invent facts.",
      },
      { role: "user", content: prompt },
    ],
  });
  return r.choices[0]?.message?.content ?? "";
}

export async function chatJSON<T>(prompt: string, system?: string, opts: { temperature?: number } = {}): Promise<T> {
  const raw = await chat(
    prompt + "\n\nIMPORTANT: Respond with ONLY a single valid JSON object. No markdown, no code fences, no commentary.",
    system,
    { temperature: opts.temperature ?? 0.2, maxTokens: 4096 }
  );
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error("LLM returned invalid JSON: " + raw.slice(0, 400));
  }
}

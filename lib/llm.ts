import OpenAI from "openai";

const CHAT_MODEL = process.env.CHAT_MODEL || "llama-3.1-70b-versatile";
const EMBED_MODEL = process.env.EMBED_MODEL || "text-embedding-3-small";

let chatClient: OpenAI | null = null;
let embedClient: OpenAI | null = null;

function getChatClient(): OpenAI {
  if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new Error("Either GROQ_API_KEY or OPENAI_API_KEY must be set.");
  }
  if (!chatClient) {
    if (process.env.GROQ_API_KEY) {
      chatClient = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      });
    } else {
      chatClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }
  return chatClient;
}

function getEmbedClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for embeddings (Groq doesn't provide embedding models).");
  }
  if (!embedClient) embedClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return embedClient;
}

export async function chat(
  prompt: string,
  system?: string,
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const r = await getChatClient().chat.completions.create({
    model: CHAT_MODEL,
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

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const r = await getEmbedClient().embeddings.create({ model: EMBED_MODEL, input: texts });
  return r.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}
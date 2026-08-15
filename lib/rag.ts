import { Memory, Chunk } from "./types";
import { llm } from "./llm";

const EMBED_MODEL = process.env.EMBED_MODEL || "text-embedding-3-small";

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const r = await llm().embeddings.create({ model: EMBED_MODEL, input: texts });
  return r.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

export function chunkText(text: string, size = 1200, overlap = 200): string[] {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (p.length > size) {
      if (cur) {
        chunks.push(cur);
        cur = "";
      }
      for (let i = 0; i < p.length; i += size - overlap) {
        chunks.push(p.slice(i, i + size));
      }
    } else if ((cur + "\n\n" + p).length > size) {
      chunks.push(cur);
      cur = p;
    } else {
      cur = cur ? cur + "\n\n" + p : p;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function buildIndex(mem: Memory, text: string): Promise<void> {
  const chunks = chunkText(text);
  const embeddings = await embed(chunks);
  mem.rag = {
    chunks: chunks.map((t, i) => ({ id: `c${i}`, text: t, embedding: embeddings[i] })),
  };
}

export function hasIndex(mem: Memory): boolean {
  return !!mem.rag && mem.rag.chunks.length > 0;
}

export async function search(mem: Memory, query: string, k = 6): Promise<{ text: string; score: number }[]> {
  if (!hasIndex(mem)) return [];
  const [qe] = await embed([query]);
  const scored = mem.rag!.chunks
    .map((c) => ({ text: c.text, score: cosine(qe, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  return scored;
}

export async function ragContext(mem: Memory, query: string, k = 6): Promise<string> {
  const hits = await search(mem, query, k);
  if (hits.length === 0) {
    return mem.rawCompanyText || mem.company?.summary || "";
  }
  return hits.map((h) => h.text).join("\n\n---\n\n");
}

export function compactText(mem: Memory): string {
  return mem.rawCompanyText.slice(0, 6000);
}

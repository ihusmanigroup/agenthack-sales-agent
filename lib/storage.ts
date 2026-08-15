import { Memory } from "./types";
import { Redis } from "@upstash/redis";

const MEMORY_KEY = "agenthack_sales_memory_v1";

const inMemory = new Map<string, string>();

let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redis = new Redis({ url, token });
  } else {
    redis = null;
  }
  return redis;
}

export function emptyMemory(): Memory {
  return {
    company: null,
    rawCompanyText: "",
    icp: null,
    leads: [],
    shortTerm: [],
    activities: [
      {
        at: new Date().toISOString(),
        agent: "system",
        action: "Initialized",
        detail: "Autonomous AI sales agent memory store created.",
      },
    ],
  };
}

export async function readMemory(): Promise<Memory> {
  const r = getRedis();
  if (r) {
    try {
      const raw = await r.get<string>(MEMORY_KEY);
      if (raw) return JSON.parse(raw) as Memory;
    } catch (e) {
      console.error("Redis read failed, falling back to in-memory", e);
    }
  }
  const raw = inMemory.get(MEMORY_KEY);
  return raw ? (JSON.parse(raw) as Memory) : emptyMemory();
}

export async function writeMemory(mem: Memory): Promise<void> {
  const r = getRedis();
  if (r) {
    try {
      await r.set(MEMORY_KEY, JSON.stringify(mem));
      return;
    } catch (e) {
      console.error("Redis write failed, falling back to in-memory", e);
    }
  }
  inMemory.set(MEMORY_KEY, JSON.stringify(mem));
}

export async function withMemory<T>(
  fn: (mem: Memory) => Promise<T> | T
): Promise<T> {
  const mem = await readMemory();
  const result = await fn(mem);
  await writeMemory(mem);
  return result;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function logActivity(mem: Memory, agent: string, action: string, detail: string) {
  mem.activities.unshift({ at: new Date().toISOString(), agent, action, detail });
  if (mem.activities.length > 300) mem.activities.length = 300;
}

export function setShortTerm(mem: Memory, key: string, value: string) {
  const existing = mem.shortTerm.find((s) => s.key === key);
  if (existing) {
    existing.value = value;
    existing.at = new Date().toISOString();
  } else {
    mem.shortTerm.unshift({ key, value, at: new Date().toISOString() });
  }
  if (mem.shortTerm.length > 40) mem.shortTerm.length = 40;
}

export function getShortTerm(mem: Memory, key: string): string | undefined {
  return mem.shortTerm.find((s) => s.key === key)?.value;
}

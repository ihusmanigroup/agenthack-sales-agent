import { NextRequest, NextResponse } from "next/server";
import { readMemory, writeMemory } from "@/lib/storage";
import { serializeMemory } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  const mem = await readMemory();
  return NextResponse.json(serializeMemory(mem));
}

export async function POST(req: NextRequest) {
  const mem = await readMemory();
  const body = await req.json();
  if (body?.restore && mem.leads.length === 0 && body.state) {
    await writeMemory(body.state);
    return NextResponse.json({ ok: true, restored: true });
  }
  return NextResponse.json(serializeMemory(mem));
}

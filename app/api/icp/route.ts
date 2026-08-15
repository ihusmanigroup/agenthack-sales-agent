import { NextRequest, NextResponse } from "next/server";
import { withMemory, readMemory } from "@/lib/storage";
import { serializeMemory } from "@/lib/serialize";
import { buildICP, ICPInput } from "@/lib/icp";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ICPInput;
    await withMemory(async (mem) => {
      await buildICP(mem, body);
    });
    const mem = await readMemory();
    return NextResponse.json({ ok: true, icp: mem.icp, state: serializeMemory(mem) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "ICP failed" }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { withMemory } from "@/lib/storage";
import { serializeMemory } from "@/lib/serialize";
import { ingestCompanyText, extractPdfText } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let text = "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const buf = Buffer.from(await file.arrayBuffer());
        const isPdf = (file as File).name.toLowerCase().endsWith(".pdf");
        text = isPdf ? await extractPdfText(buf) : buf.toString("utf-8");
      } else {
        text = String(form.get("text") || "");
      }
    } else {
      const body = await req.json();
      text = body.text || "";
    }

    const result = await withMemory(async (mem) => {
      const knowledge = await ingestCompanyText(mem, text);
      return knowledge;
    });

    return NextResponse.json({ ok: true, knowledge: result, state: serializeMemory(await (await import("@/lib/storage")).readMemory()) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Ingest failed" }, { status: 400 });
  }
}

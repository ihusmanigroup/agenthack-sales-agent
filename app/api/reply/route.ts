import { NextRequest, NextResponse } from "next/server";
import { withMemory, readMemory, logActivity } from "@/lib/storage";
import { serializeMemory } from "@/lib/serialize";
import { classifyReply, answerQuestion } from "@/lib/classify";
import { finalizeMeeting } from "@/lib/meeting";
import { sendMeetingConfirmationEmail, emailId } from "@/lib/outreach";
import { sendEmail } from "@/lib/channels";
import { transition } from "@/lib/pipeline";
import { scheduleFollowUp } from "@/lib/followup";
import { requireLead } from "@/app/api/helpers";
import { Lead, Memory } from "@/lib/types";

export const dynamic = "force-dynamic";

function nextBusinessMorning(): Date {
  const d = new Date();
  let added = 0;
  while (added < 2) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  d.setHours(10, 0, 0, 0);
  return d;
}

async function replyTo(mem: Memory, lead: Lead, to: string, toName: string, subject: string, body: string) {
  const rec = {
    id: emailId(),
    to,
    toName,
    subject,
    body,
    sentAt: new Date().toISOString(),
    channel: "email" as const,
    simulated: !process.env.RESEND_API_KEY,
  };
  const res = await sendEmail(rec);
  rec.simulated = res.simulated;
  lead.emails.push(rec);
  logActivity(mem, "Responses", `Auto-reply sent to ${lead.company} (${toName})`, subject);
  return rec;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, from, text } = body;
    let classification;

    await withMemory(async (mem) => {
      const lead = requireLead(mem, leadId);
      classification = await classifyReply(mem, lead, from, text);
      const cls = classification.classification.toLowerCase();

      if (cls.includes("meeting") || cls.includes("positive") || cls.includes("interested")) {
        const time = nextBusinessMorning();
        const meeting = await finalizeMeeting(mem, lead, time.toISOString(), { requestedTime: body.requestedTime });
        const contact = lead.contacts?.find((c) => c.email === from) || lead.contacts?.[0];
        if (contact) {
          await sendMeetingConfirmationEmail(mem, lead, contact);
        }
        transition(mem, lead, "Meeting Scheduled", `Auto-confirmed meeting ${time.toLocaleString()} (${meeting.link}).`);
      } else if (cls.includes("question")) {
        const answer = await answerQuestion(mem, lead, text);
        const contact = lead.contacts?.find((c) => c.email === from) || lead.contacts?.[0];
        const name = contact?.name || "there";
        await replyTo(mem, lead, from, name, `Re: your question about ${lead.matchedService || "our service"}`, answer);
        lead.stage = "Interested";
      } else if (cls.includes("pricing") || cls.includes("technical")) {
        const answer = await answerQuestion(mem, lead, `The prospect raised this objection: ${text}. Please address it, including pricing/packages or integrations/technical details from the knowledge base.`);
        const contact = lead.contacts?.find((c) => c.email === from) || lead.contacts?.[0];
        const name = contact?.name || "there";
        await replyTo(mem, lead, from, name, `Re: ${lead.matchedService || "our service"}`, answer);
      } else if (cls.includes("not interested")) {
        transition(mem, lead, "Not Interested", `Prospect: "${classification.summary}"`);
      } else if (cls.includes("not now")) {
        scheduleFollowUp(mem, lead, 30);
        await replyTo(mem, lead, from, "there", "Re: timing", "Totally understand. I'll touch base in a few weeks — feel free to reach out anytime before that.");
      } else if (cls.includes("wrong person") || cls.includes("referral")) {
        await replyTo(mem, lead, from, "there", "Re: referral", "Thanks for pointing me in the right direction! Would you be able to introduce me to the person who owns customer communication/support decisions? Happy to take it from there.");
      } else {
        await replyTo(mem, lead, from, "there", `Re: ${lead.matchedService || "our service"}`, `Thank you for your message. I'll make sure the right person on our team follows up with you shortly.`);
      }
      lead.updatedAt = new Date().toISOString();
    });

    const mem = await readMemory();
    return NextResponse.json({ ok: true, classification, state: serializeMemory(mem) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Reply handling failed" }, { status: 400 });
  }
}

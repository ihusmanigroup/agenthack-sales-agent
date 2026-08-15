import { Memory, Lead, FollowUpRecord } from "./types";
import { chat } from "./llm";
import { ragContext } from "./rag";
import { sendEmail, sendWhatsApp } from "./channels";
import { bookingLink } from "./meeting";
import { emailId } from "./outreach";
import { logActivity, uid } from "./storage";

export function scheduleFollowUp(mem: Memory, lead: Lead, days = 3): FollowUpRecord {
  const existing = lead.followUps.find((f) => f.status === "scheduled");
  if (existing) return existing;
  const rec: FollowUpRecord = {
    id: uid("fu"),
    scheduledAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
    status: "scheduled",
  };
  lead.followUps.push(rec);
  lead.updatedAt = new Date().toISOString();
  logActivity(mem, "Follow-up", `Follow-up scheduled for ${lead.company}`, `Email #2 due ${new Date(rec.scheduledAt).toLocaleString()} (Day ${days}).`);
  return rec;
}

export async function runDueFollowUps(mem: Memory): Promise<string[]> {
  const now = Date.now();
  const report: string[] = [];

  for (const lead of mem.leads) {
    const followUp = lead.followUps.find((f) => f.status === "scheduled" && new Date(f.scheduledAt).getTime() <= now);
    if (!followUp) continue;
    const contact = lead.contacts?.[0];
    const target = contact ? contact : undefined;

    const context = await ragContext(mem, lead.matchedService || "our services", 5);
    const firstEmail = lead.emails.find((e) => e.channel === "email" && !e.followUp);

    const body = await chat(
      `Write a short follow-up email (140-170 words) to ${lead.company}${contact ? `, ${contact.role}` : ""}.

We emailed them earlier (subject: ${firstEmail?.subject || "our first outreach"}) about: ${lead.matchedService || "our service"}.

Prospect context/signals: ${lead.research?.signals?.join("; ") || lead.description || "unknown"}
Recommended service: ${lead.matchedService} — ${lead.matchedServiceReason || ""}

Seller knowledge context:
${context.slice(0, 1800)}

Booking link: ${bookingLink()}

Rules: polite, value-focused, not pushy. Add a NEW concrete angle or insight not repeated from the first email (e.g. a relevant case study or a specific pain point). Include a soft call to action with the booking link. Never invent prospect facts. Sign as ${process.env.SELLER_NAME || "your name"}.

Return ONLY JSON: {"subject":"...","body":"..."}`,
      "You write concise, evidence-based follow-up sales emails. Return only valid JSON.",
      { temperature: 0.5 }
    );

    let subject = `Re: ${lead.company}`;
    let text = body;
    try {
      const cleaned = body.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const obj = JSON.parse(cleaned);
      subject = obj.subject;
      text = obj.body;
    } catch {
      /* keep defaults */
    }

    const emailRec = {
      id: emailId(),
      to: contact?.email ?? `${lead.company.toLowerCase().replace(/[^a-z0-9]+/g, "")}@example.com`,
      toName: contact?.name || lead.company,
      subject,
      body: text,
      meetingLink: bookingLink(),
      sentAt: new Date().toISOString(),
      channel: "email" as const,
      simulated: !process.env.RESEND_API_KEY,
      followUp: true,
    };
    const res = await sendEmail(emailRec);
    emailRec.simulated = res.simulated;
    lead.emails.push(emailRec);
    followUp.status = "sent";
    followUp.emailId = emailRec.id;
    lead.updatedAt = new Date().toISOString();
    logActivity(mem, "Follow-up", `Follow-up email #2 sent to ${lead.company}`, `${subject} — ${res.simulated ? "SIMULATED" : "sent"}.`);
    report.push(`${lead.company}: ${subject}`);

    if (lead.whatsapp) {
      const wa = await chat(`Write a one-line WhatsApp nudge to ${lead.company}: they haven't replied to our follow-up email about ${lead.matchedService}. Friendly, no emoji, plain text.`);
      const wRes = await sendWhatsApp(lead.whatsapp, wa);
      const wRec = {
        id: emailId(),
        to: lead.whatsapp,
        toName: lead.company,
        subject: "WhatsApp follow-up",
        body: wa,
        sentAt: new Date().toISOString(),
        channel: "whatsapp" as const,
        simulated: wRes.simulated,
        followUp: true,
      };
      lead.emails.push(wRec);
      logActivity(mem, "Follow-up", `WhatsApp nudge to ${lead.company}`, wRes.simulated ? "SIMULATED." : "Sent.");
    }
  }

  return report;
}

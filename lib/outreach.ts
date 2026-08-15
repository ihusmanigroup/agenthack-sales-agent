import { Memory, Lead, Contact, EmailRecord } from "./types";
import { chat } from "./llm";
import { ragContext } from "./rag";
import { sendEmail, sendWhatsApp } from "./channels";
import { bookingLink } from "./meeting";
import { logActivity, uid } from "./storage";

export function emailId(): string {
  return uid("email");
}

export async function generateOutreachEmail(
  mem: Memory,
  lead: Lead,
  contact: Contact,
  bookingUrl: string
): Promise<{ subject: string; body: string }> {
  const signals = lead.research?.signals?.join("; ") || lead.description || "an opportunity to improve how they operate";
  const evidence = lead.research?.evidence
    ?.map((e) => `[${e.type}] ${e.detail}`)
    .slice(0, 6)
    .join("\n") || "no public evidence collected";
  const context = await ragContext(mem, `selling ${lead.matchedService || "our services"} to ${lead.company}`, 6);

  const roleAngle = roleAngleFor(contact.role);

  const prompt = `Write a single personalized outreach email (subject + body) from the seller to ${contact.name}, ${contact.role} at ${lead.company}.

SELLER COMPANY (our services, grounded knowledge):
${mem.company ? mem.company.services.map((s) => `- ${s.name}: ${s.description}`).join("\n") : "-"}

RAG CONTEXT:
${context.slice(0, 2500)}

PROSPECT SITUATION (evidence only, never invent more):
- Signals: ${signals}
- Evidence:
${evidence.slice(0, 2500)}

Recommended service: ${lead.matchedService || "the best-fit service"} — ${lead.matchedServiceReason || ""}

ROLE ANGLE for ${contact.role}: ${roleAngle}

MEETING LINK to include: ${bookingUrl}

Rules:
- Role-appropriate: the angle must fit ${contact.role}'s priorities.
- Evidence-based: reference the prospect's real situation only; never invent facts about them.
- Short (120-170 words body). Professional, specific, zero hype.
- One clear call to action: book a 15-minute call at ${bookingUrl}.
- Sign as a human seller (name: ${process.env.SELLER_NAME || "Your name"}). If the contact name looks like a placeholder like "CEO (name not in evidence)", greet them by role only.

Return ONLY JSON: {"subject":"...","body":"..."}`;

  const text = await chat(prompt, "You write concise, personalized, evidence-based B2B sales emails. Return only valid JSON.", { temperature: 0.5 });
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const obj = JSON.parse(cleaned);
    return { subject: obj.subject, body: obj.body };
  } catch {
    return { subject: `${lead.company} — ${lead.matchedService || "quick idea"}`, body: text };
  }
}

function roleAngleFor(role: string): string {
  const r = role.toLowerCase();
  if (r.includes("cto") || r.includes("technolog") || r.includes("engineering") || r.includes("it"))
    return "technical fit, integrations, security and implementation effort";
  if (r.includes("sales") || r.includes("revenue") || r.includes("growth"))
    return "productivity, lead response speed and revenue impact";
  if (r.includes("support") || r.includes("customer") || r.includes("success"))
    return "response time, workload reduction and customer satisfaction";
  if (r.includes("cfo") || r.includes("finance") || r.includes("oper"))
    return "cost savings, efficiency and ROI";
  return "reducing friction and improving outcomes";
}

export async function sendOutreach(mem: Memory, lead: Lead, contactIndex?: number): Promise<EmailRecord[]> {
  if (!lead.contacts || lead.contacts.length === 0) throw new Error("Qualify the lead first to get decision-makers.");
  const contacts = contactIndex !== undefined ? [lead.contacts[contactIndex]] : lead.contacts;

  const sent: EmailRecord[] = [];
  for (const contact of contacts) {
    const bookingUrl = bookingLink();
    const { subject, body } = await generateOutreachEmail(mem, lead, contact, bookingUrl);
    const to = contact.email ?? `${lead.company.toLowerCase().replace(/[^a-z0-9]+/g, "")}@example.com`;
    const rec: EmailRecord = {
      id: emailId(),
      to,
      toName: contact.name,
      subject,
      body,
      meetingLink: bookingUrl,
      sentAt: new Date().toISOString(),
      channel: "email",
      simulated: !process.env.RESEND_API_KEY,
    };
    const res = await sendEmail(rec);
    rec.simulated = res.simulated;
    lead.emails.push(rec);
    sent.push(rec);
    logActivity(mem, "Outreach", `Email sent to ${contact.name} (${contact.role}) at ${lead.company}`, `${rec.subject} — ${res.simulated ? "SIMULATED" : "sent via " + (process.env.RESEND_API_KEY ? "Resend" : "none")}.`);
  }

  if (lead.whatsapp) {
    const brief = await chat(
      `Write a short 3-4 line WhatsApp intro message to ${lead.company} (they contacted us via WhatsApp). Mention we sell ${lead.matchedService} and that we emailed their team; ask who is the right person to talk to. No emojis. Plain text.`
    );
    const res = await sendWhatsApp(lead.whatsapp, brief);
    const rec: EmailRecord = {
      id: emailId(),
      to: lead.whatsapp,
      toName: lead.company,
      subject: "WhatsApp intro",
      body: brief,
      sentAt: new Date().toISOString(),
      channel: "whatsapp",
      simulated: res.simulated,
    };
    lead.emails.push(rec);
    sent.push(rec);
    logActivity(mem, "Outreach", `WhatsApp intro sent to ${lead.company}`, res.simulated ? "SIMULATED WhatsApp message." : "WhatsApp message sent.");
  }

  lead.stage = "Contacted";
  lead.contactedAt = new Date().toISOString();
  lead.updatedAt = new Date().toISOString();
  return sent;
}

export async function sendMeetingConfirmationEmail(mem: Memory, lead: Lead, contact: Contact): Promise<EmailRecord> {
  if (!lead.meeting) throw new Error("Finalize a meeting first.");
  const body = `Hi ${contact.name},

Great — your meeting is confirmed.

${lead.company} · ${contact.role}

Time: ${new Date(lead.meeting.time).toLocaleString()}
Meeting link: ${lead.meeting.link}

See you there!

${process.env.SELLER_NAME || "Your name"}`;
  const rec: EmailRecord = {
    id: emailId(),
    to: contact.email ?? `${lead.company.toLowerCase().replace(/[^a-z0-9]+/g, "")}@example.com`,
    toName: contact.name,
    subject: `Confirmed: meeting ${new Date(lead.meeting.time).toLocaleString()}`,
    body,
    meetingLink: lead.meeting.link,
    sentAt: new Date().toISOString(),
    channel: "email",
    simulated: !process.env.RESEND_API_KEY,
  };
  const res = await sendEmail(rec);
  rec.simulated = res.simulated;
  lead.emails.push(rec);
  logActivity(mem, "Outreach", `Meeting confirmation email to ${contact.name}`, `${rec.subject}`);
  return rec;
}

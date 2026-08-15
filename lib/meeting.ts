import { Memory, Lead, Meeting } from "./types";
import { chat } from "./llm";
import { ragContext } from "./rag";
import { sendWhatsApp } from "./channels";
import { logActivity, uid } from "./storage";

export function newMeetingLink(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 12; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `https://meet.google.com/${code.slice(0, 3)}-${code.slice(3, 7)}-${code.slice(7)}`;
}

export function bookingLink(): string {
  const custom = process.env.BOOKING_URL;
  if (custom) return custom;
  return newMeetingLink();
}

export async function buildMeetingBriefing(mem: Memory, lead: Lead): Promise<string> {
  const context = await ragContext(mem, lead.matchedService || "our services", 5);
  const objections = lead.replies.map((r) => r.text).join(" | ");
  const prompt = `Write a very short meeting briefing (max 120 words) for the sales admin who will run a call with ${lead.company}.

- Prospect problem: ${lead.research?.signals?.join("; ") || lead.description || "unknown"}
- Recommended service: ${lead.matchedService || "TBD"} (${lead.matchedServiceReason || ""})
- Important objections / questions seen: ${objections || "none yet"}
- What to discuss: the talk track ${lead.research?.profile?.technologies?.length ? `, referencing their stack (${lead.research.profile.technologies.join(", ")})` : ""}

Ground the briefing in the company's knowledge:
${context.slice(0, 1200)}

Output plain text only.`;
  return chat(prompt, "You write concise, useful sales meeting briefings. Plain text, no markdown.", { temperature: 0.4 });
}

export async function finalizeMeeting(
  mem: Memory,
  lead: Lead,
  time: string,
  opts?: { requestedTime?: string }
): Promise<Meeting> {
  if (!lead.meeting) {
    lead.meeting = {
      link: newMeetingLink(),
      time,
      requestedTime: opts?.requestedTime,
    };
  } else {
    lead.meeting.link = newMeetingLink();
    lead.meeting.time = time;
    lead.meeting.requestedTime = opts?.requestedTime;
  }
  lead.meeting.briefing = await buildMeetingBriefing(mem, lead);

  const reminderAt = new Date(new Date(time).getTime() - 30 * 60 * 1000).toISOString();
  lead.meeting.reminderAt = reminderAt;
  lead.meeting.reminderSent = false;

  lead.stage = "Meeting Scheduled";
  lead.updatedAt = new Date().toISOString();

  const adminNumber = process.env.ADMIN_WHATSAPP;
  if (adminNumber) {
    const msg = [
      `NEW MEETING SCHEDULED 🎯`,
      ``,
      `Company: ${lead.company}`,
      `Time: ${new Date(time).toLocaleString()}`,
      `Meeting link: ${lead.meeting.link}`,
      `Service: ${lead.matchedService || "TBD"}`,
      `Lead score: ${lead.score ?? "-"}/100`,
      ``,
      `Briefing:`,
      lead.meeting.briefing,
    ].join("\n");
    const res = await sendWhatsApp(adminNumber, msg);
    lead.meeting.adminNotifiedAt = new Date().toISOString();
    logActivity(mem, "Meeting", `Meeting finalized: ${lead.company}`, `${lead.meeting.link} @ ${time}. Admin notified on WhatsApp (${res.simulated ? "simulated" : "sent"}).`);
  } else {
    logActivity(mem, "Meeting", `Meeting finalized: ${lead.company}`, `${lead.meeting.link} @ ${time}. Admin notification skipped (ADMIN_WHATSAPP not set).`);
  }

  return lead.meeting;
}

export async function runMeetingReminders(mem: Memory): Promise<{ lead: Lead; sentSimulated: boolean }[]> {
  const now = Date.now();
  const due: { lead: Lead; sentSimulated: boolean }[] = [];
  for (const lead of mem.leads) {
    const m = lead.meeting;
    if (!m || m.reminderSent || !m.reminderAt) continue;
    if (new Date(m.reminderAt).getTime() > now) continue;
    const adminNumber = process.env.ADMIN_WHATSAPP;
    if (!adminNumber) continue;
    const msg = [
      `⏰ MEETING REMINDER — starts in 30 minutes`,
      ``,
      `Company: ${lead.company}`,
      `Time: ${new Date(m.time).toLocaleString()}`,
      `Link: ${m.link}`,
      ``,
      `Briefing:`,
      m.briefing ?? "No briefing available.",
    ].join("\n");
    const res = await sendWhatsApp(adminNumber, msg);
    m.reminderSent = true;
    m.reminderSentAt = new Date().toISOString();
    logActivity(mem, "Meeting", `Reminder sent for ${lead.company}`, `30-minute reminder delivered via WhatsApp (${res.simulated ? "simulated" : "sent"}).`);
    due.push({ lead, sentSimulated: res.simulated });
  }
  return due;
}

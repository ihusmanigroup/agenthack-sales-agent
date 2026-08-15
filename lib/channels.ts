import { EmailRecord } from "./types";

export interface SendResult {
  sent: boolean;
  simulated: boolean;
  channel: "email" | "whatsapp";
}

export async function sendEmail(email: EmailRecord): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Sales Agent <onboarding@resend.dev>";
  if (key && from) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email.to],
          subject: email.subject,
          html: email.body.replace(/\n/g, "<br/>"),
        }),
      });
      if (!res.ok) {
        throw new Error(`Resend error ${res.status}: ${await res.text()}`);
      }
      return { sent: true, simulated: false, channel: "email" };
    } catch (e) {
      console.error("Email send failed, simulating", e);
      return { sent: true, simulated: true, channel: "email" };
    }
  }
  return { sent: true, simulated: true, channel: "email" };
}

export async function sendWhatsApp(to: string, text: string): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (sid && token && from) {
    try {
      const auth = Buffer.from(`${sid}:${token}`).toString("base64");
      const body = new URLSearchParams();
      body.append("From", from);
      body.append("To", `whatsapp:${to.replace(/^whatsapp:/, "")}`);
      body.append("Body", text);
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}` },
        body,
      });
      if (!res.ok) throw new Error(`Twilio error ${res.status}: ${await res.text()}`);
      return { sent: true, simulated: false, channel: "whatsapp" };
    } catch (e) {
      console.error("WhatsApp send failed, simulating", e);
      return { sent: true, simulated: true, channel: "whatsapp" };
    }
  }
  return { sent: true, simulated: true, channel: "whatsapp" };
}

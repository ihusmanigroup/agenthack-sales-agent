import { Memory, Lead, RESPONSE_CLASSES } from "./types";
import { chatJSON } from "./llm";
import { logActivity } from "./storage";

export interface Classification {
  classification: string;
  nextAction: string;
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
}

const classes = [...RESPONSE_CLASSES].join('", "');

export async function classifyReply(mem: Memory, lead: Lead, from: string, text: string): Promise<Classification> {
  const result = await chatJSON<Classification>(
    `A prospect just replied to our sales email.

Prospect company: ${lead.company}
From: ${from}
Recommended service discussed: ${lead.matchedService || "our service"}

REPLY:
"""${text}"""

Classify the reply. classification must be one of: "${classes}".

Return JSON:
{
  "classification": "<one of the above>",
  "nextAction": "the next step the sales agent should take in the pipeline (specific)",
  "summary": "1-2 sentence summary of the reply",
  "sentiment": "positive" | "neutral" | "negative"
}`,
    "You are an email-classification agent in a sales pipeline. Choose the classification that drives the correct next action."
  );

  lead.replies.push({
    id: "reply_" + Date.now().toString(36),
    from,
    text,
    receivedAt: new Date().toISOString(),
    classification: result.classification,
    nextAction: result.nextAction,
    summary: result.summary,
  });

  const cls = result.classification.toLowerCase();
  if (cls.includes("meeting") || cls.includes("positive") || cls.includes("interested")) {
    lead.stage = "Interested";
  } else if (cls.includes("not interested") || cls.includes("wrong person")) {
    lead.stage = "Not Interested";
  } else if (cls.includes("not now")) {
    lead.stage = "Contacted";
    lead.notes = (lead.notes ? lead.notes + "\n" : "") + "Prospect said 'not now' — re-engage later.";
  }

  lead.updatedAt = new Date().toISOString();
  logActivity(mem, "Responses", `Reply from ${lead.company} (${from})`, `${result.classification} — ${result.summary}`);

  return result;
}

export async function answerQuestion(mem: Memory, lead: Lead, question: string): Promise<string> {
  const { ragContext } = await import("./rag");
  const context = await ragContext(mem, question, 6);
  return await (await import("./llm")).chat(
    `Answer this prospect question from ${lead.company} accurately, using ONLY the seller's knowledge base below. Be concise and helpful. If the knowledge base doesn't contain the answer, say so honestly and offer to check with the team.

Knowledge base:
${context.slice(0, 3000)}

Question: ${question}`,
    "You are a helpful, accurate sales assistant. Never fabricate product details."
  );
}

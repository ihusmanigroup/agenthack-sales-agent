"use client";

import { useState } from "react";
import { Lead, Stage } from "@/lib/types";
import { ClientMemory } from "@/lib/serialize";
import { Btn, Card, Field, inputCls, Empty, StageBadge, ScoreBadge, Label, Spinner } from "./ui";
import { post } from "@/lib/client";

interface TabProps {
  state: ClientMemory;
  act: (url: string, body?: unknown) => Promise<any>;
  refresh: () => void;
}

export function SetupTab({ state, act, refresh }: TabProps) {
  const [companyText, setCompanyText] = useState(state.rawCompanyText || "");
  const [icp, setIcp] = useState({
    location: state.icp?.location || "",
    industry: state.icp?.industry || "",
    companySize: state.icp?.companySize || "",
    specialTarget: state.icp?.specialTarget || "",
    extraNotes: state.icp?.notes || "",
  });
  const [mode, setMode] = useState<"demo" | "vendor" | "search">("demo");
  const [vendorText, setVendorText] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const handleIngest = async () => {
    if (!companyText.trim()) return setMsg("Paste company text or upload a PDF first.");
    setLoading("ingest");
    setMsg(null);
    await act("/api/ingest", { text: companyText });
    setMsg("Company ingested and RAG built.");
    setLoading(null);
    refresh();
  };

  const handleLoadSample = async () => {
    setLoading("sample");
    await act("/api/ingest", { text: SAMPLE_COMPANY });
    setMsg("Sample company (NexaBot AI) loaded.");
    setLoading(null);
    refresh();
  };

  const handleIcp = async () => {
    if (!icp.location && !icp.industry) return setMsg("Fill at least location and industry.");
    setLoading("icp");
    await act("/api/icp", icp);
    setMsg("ICP saved.");
    setLoading(null);
    refresh();
  };

  const handleDiscover = async () => {
    setLoading("discover");
    await act("/api/discover", { mode, vendorText });
    setMsg(`Discovered leads (${mode}).`);
    setLoading(null);
    refresh();
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-4 text-lg font-semibold">1. Company Knowledge (RAG)</h2>
        <Card className="p-4 space-y-4">
          <Field label="Company description / paste full text">
            <textarea
              value={companyText}
              onChange={(e) => setCompanyText(e.target.value)}
              className={inputCls}
              rows={10}
              placeholder="Paste the complete company description, services, target industries, case studies, pricing, tech stack, limitations..."
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={handleIngest} loading={loading === "ingest"}>Ingest & Build RAG</Btn>
            <Btn variant="secondary" onClick={handleLoadSample} loading={loading === "sample"}>
              Load Sample Company (NexaBot AI)
            </Btn>
            <Btn variant="secondary" onClick={() => document.getElementById("fileInput")?.click()}>
              Upload PDF
            </Btn>
            <input
              id="fileInput"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const form = new FormData();
                  form.append("file", file);
                  setLoading("ingest");
                  await post("/api/ingest", form);
                  setMsg("PDF uploaded and ingested.");
                  setLoading(null);
                  refresh();
                }
              }}
            />
          </div>
          {msg && <div className="text-sm text-emerald-300">{msg}</div>}
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">2. Ideal Customer Profile (ICP)</h2>
        <Card className="p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Target location">
              <input value={icp.location} onChange={(e) => setIcp({ ...icp, location: e.target.value })} className={inputCls} placeholder="e.g. Karachi, Pakistan" />
            </Field>
            <Field label="Target industry / market">
              <input value={icp.industry} onChange={(e) => setIcp({ ...icp, industry: e.target.value })} className={inputCls} placeholder="e.g. Logistics, Healthcare, E-commerce" />
            </Field>
            <Field label="Company size / criteria">
              <input value={icp.companySize} onChange={(e) => setIcp({ ...icp, companySize: e.target.value })} className={inputCls} placeholder="e.g. 50-200 employees, Series A funded" />
            </Field>
            <Field label="Special target (problem / use case / service)">
              <input value={icp.specialTarget} onChange={(e) => setIcp({ ...icp, specialTarget: e.target.value })} className={inputCls} placeholder="e.g. High WhatsApp support volume, manual order intake" />
            </Field>
          </div>
          <Field label="Extra notes (optional)">
            <textarea value={icp.extraNotes} onChange={(e) => setIcp({ ...icp, extraNotes: e.target.value })} className={inputCls} rows={2} />
          </Field>
          <Btn onClick={handleIcp} loading={loading === "icp"}>Save ICP</Btn>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">3. Lead Discovery</h2>
        <Card className="p-4 space-y-4">
          <Field label="Discovery mode">
            <div className="flex flex-wrap gap-2">
              {(["demo", "vendor", "search"] as const).map((m) => (
                <label key={m} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm cursor-pointer ${mode === m ? "border-indigo-500 bg-indigo-500/10 text-indigo-300" : "border-zinc-700 text-zinc-400 hover:border-zinc-600"}`}>
                  <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </label>
              ))}
            </div>
          </Field>
          {mode === "vendor" && (
            <Field label="Paste vendor list (one per line, e.g. Company | Location | Industry | Size)">
              <textarea value={vendorText} onChange={(e) => setVendorText(e.target.value)} className={inputCls} rows={6} />
            </Field>
          )}
          {mode === "search" && !state.company && (
            <p className="text-xs text-rose-400">Web search requires BRAVE_API_KEY or SERPER_API_KEY in environment. Using Demo mode for now.</p>
          )}
          <Btn onClick={handleDiscover} loading={loading === "discover"}>Run Discovery & Cheap Filtering</Btn>
        </Card>
      </section>

      {state.company && (
        <Card className="p-4 space-y-2 border-emerald-800 bg-emerald-950/30">
          <div className="flex items-center gap-2 text-emerald-300"><span>✓</span> <b>{state.company.name}</b> loaded — {state.company.services.length} services, {state.rag?.chunkCount ?? 0} chunks indexed.</div>
          <div className="text-xs text-emerald-400">Services: {state.company.services.map((s) => s.name).join(", ")}</div>
        </Card>
      )}
    </div>
  );
}

const SAMPLE_COMPANY = `Company: NexaBot AI (NexaBot)
Tagline: AI-powered customer communication and support automation for fast-growing companies.

Who we are
NexaBot AI is a software company based in Karachi, Pakistan that builds AI automation for customer communication. We help companies answer customer messages on WhatsApp, Instagram, Facebook Messenger and web chat 24/7 without hiring more support agents.

Services and capabilities
1. WhatsApp AI Chatbot: an AI assistant trained on your business that instantly replies to customer questions on WhatsApp in your brand's tone. Handles order status, product questions, FAQ, and after-hours messages. Integrates with the WhatsApp Business API.
2. Customer Support Automation: routing, auto-triage, and AI-suggested replies for support teams. Cuts average response time from hours to seconds and lets human agents focus on complex tickets.
3. AI Lead Capture & Qualification: captures WhatsApp and web leads, asks qualifying questions automatically, and sends them straight to your sales team or CRM.
4. E-commerce Order Automation: order confirmation, tracking updates, and delivery notifications delivered automatically over WhatsApp.
5. Appointment & Booking Automation: AI-powered appointment scheduling, reminders, and rescheduling for clinics, academies, salons and agencies.
6. AI Voice Assistant (IVR): phone automation for missed-call follow-up and simple inbound calls.
7. Custom AI Assistants / GPT integrations: bespoke assistants connected to a company's data, ERP, or CRM for special use cases.

Target industries and customers
- Logistics and freight: shipment tracking, rate quotes, customer service.
- Retail and e-commerce: order updates, support, cart recovery.
- Healthcare: appointment booking, reminders, report delivery.
- Food and restaurants: online ordering and delivery updates.
- Education and academies: admissions, course info, follow-ups.
- Real estate: inquiry triage and instant replies.
- Telecom retail: after-hours support and repair status.
- We work best with companies that receive a high volume of customer messages and rely on WhatsApp for customer communication.

Pricing and packages
- Starter: PKR 95,000 setup + PKR 45,000/month, up to 2,000 conversations/month, one WhatsApp number, basic FAQ chatbot.
- Growth: PKR 185,000 setup + PKR 95,000/month, unlimited conversations, WhatsApp + Instagram + web chat, e-commerce order automation, CRM integrations.
- Enterprise: custom pricing, includes voice assistant, multi-language support, dedicated manager, 99.9% SLA, on-premise options.

Integrations and technology
- WhatsApp Business API (official, green-tick eligible)
- Instagram, Facebook Messenger, web chat widget
- Shopify, WooCommerce, Daraz
- HubSpot, Salesforce, Zoho CRM
- Google Calendar, Calendly
- MySQL, PostgreSQL, REST API
- Built on OpenAI GPT models and RAG (retrieval-augmented generation) over each customer's data.
- 24/7 uptime with fast response in Urdu, English, and Arabic.

Case studies
1. SwiftRoute Logistics: implemented WhatsApp AI chatbot for shipment tracking and quotes. Answer time dropped from 2 hours to 15 seconds; 60% of support volume automated in 4 weeks.
2. Nimbus Cloud Kitchens: automated order intake across 14 brands on one WhatsApp number. Missed orders fell by 90%; 3 staff redeployed to other tasks.
3. Crestview Dental Clinic: automated appointment booking and reminders. No-show rate dropped by 45%; 70% of bookings now happen outside opening hours.

Limitations and conditions
- Setup requires 2-4 weeks depending on integrations.
- Best results when the customer shares their FAQ, product catalog, or order systems.
- We do not sell to customers with fewer than ~10 inbound customer messages per day.
- WhatsApp numbers are subject to WhatsApp Business API approval and policies.
- Prices are in PKR and quoted per project.

Selling points
- Instant 24/7 replies in the customer's own language.
- Directly reduces support costs and response time.
- Works on the channels customers already use (WhatsApp first).
- Trained on each business's own data with RAG, so answers are accurate.
- Fast setup with ready-made templates for logistics, clinics, academies, e-commerce and more.`;
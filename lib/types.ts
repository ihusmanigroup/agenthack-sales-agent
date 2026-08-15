export type Stage =
  | "Discovered"
  | "Potential"
  | "Researching"
  | "Qualified"
  | "Contacted"
  | "Interested"
  | "Meeting Scheduled"
  | "Converted"
  | "Not Qualified"
  | "Not Interested"
  | "Do Not Contact";

export const STAGES: Stage[] = [
  "Discovered",
  "Potential",
  "Researching",
  "Qualified",
  "Contacted",
  "Interested",
  "Meeting Scheduled",
  "Converted",
  "Not Qualified",
  "Not Interested",
  "Do Not Contact",
];

export const PIPELINE_STAGES: Stage[] = [
  "Discovered",
  "Potential",
  "Researching",
  "Qualified",
  "Contacted",
  "Interested",
  "Meeting Scheduled",
  "Converted",
];

export const NEGATIVE_STAGES: Stage[] = ["Not Qualified", "Not Interested", "Do Not Contact"];

export interface Service {
  name: string;
  description: string;
}

export interface CaseStudy {
  title: string;
  summary: string;
}

export interface CompanyKnowledge {
  name: string;
  summary: string;
  services: Service[];
  targetIndustries: string[];
  targetCustomers: string;
  caseStudies: CaseStudy[];
  pricing: string;
  technologies: string[];
  integrations: string[];
  limitations: string;
  sellingPoints: string[];
}

export interface ICP {
  location: string;
  industry: string;
  companySize: string;
  specialTarget: string;
  keywords: string[];
  notes?: string;
  createdAt: string;
}

export interface EvidenceItem {
  type: string;
  detail: string;
  url?: string;
  simulated?: boolean;
}

export interface Contact {
  name: string;
  role: string;
  email?: string;
  linkedin?: string;
  relevance: string;
}

export interface EmailRecord {
  id: string;
  to: string;
  toName: string;
  subject: string;
  body: string;
  meetingLink?: string;
  sentAt: string;
  channel: "email" | "whatsapp";
  simulated: boolean;
  followUp?: boolean;
}

export interface ReplyRecord {
  id: string;
  from: string;
  text: string;
  receivedAt: string;
  classification: string;
  nextAction: string;
  summary?: string;
}

export interface FollowUpRecord {
  id: string;
  scheduledAt: string;
  status: "scheduled" | "sent";
  emailId?: string;
  note?: string;
}

export interface Meeting {
  link: string;
  time: string;
  requestedTime?: string;
  briefing?: string;
  adminNotifiedAt?: string;
  reminderAt?: string;
  reminderSent?: boolean;
  reminderSentAt?: string;
}

export interface ResearchProfile {
  summary: string;
  profile: {
    website?: string;
    employees?: string;
    funding?: string;
    news?: string[];
    technologies?: string[];
  };
  signals: string[];
  evidence: EvidenceItem[];
}

export interface Lead {
  id: string;
  company: string;
  website?: string;
  location?: string;
  industry?: string;
  size?: string;
  description?: string;
  source: "search" | "vendor" | "demo" | "manual";
  sourceLabel?: string;
  whatsapp?: string;
  stage: Stage;
  score?: number;
  scoreReason?: string;
  research?: ResearchProfile;
  contacts?: Contact[];
  matchedService?: string;
  matchedServiceReason?: string;
  emails: EmailRecord[];
  replies: ReplyRecord[];
  followUps: FollowUpRecord[];
  meeting?: Meeting;
  qualifiedAt?: string;
  contactedAt?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  simulated?: boolean;
}

export interface ShortTermEntry {
  key: string;
  value: string;
  at: string;
}

export interface Activity {
  at: string;
  agent: string;
  action: string;
  detail: string;
}

export interface Chunk {
  id: string;
  text: string;
  embedding: number[];
}

export interface Memory {
  company: CompanyKnowledge | null;
  rawCompanyText: string;
  icp: ICP | null;
  leads: Lead[];
  rag?: { chunks: Chunk[] };
  shortTerm: ShortTermEntry[];
  currentTask?: string;
  activities: Activity[];
}

export const RESPONSE_CLASSES = [
  "Positive / Interested",
  "Meeting requested",
  "Question",
  "Pricing objection",
  "Technical objection",
  "Not interested",
  "Not now",
  "Wrong person / Referral",
  "Other",
] as const;

import { Metadata } from "next";
import Dashboard from "@/components/Dashboard";

export const metadata: Metadata = {
  title: "Autonomous AI Sales Agent",
  description: "End-to-end AI sales pipeline: RAG → ICP → Discovery → Research → Qualification → Outreach → Follow-up",
};

export default function Home() {
  return <Dashboard />;
}
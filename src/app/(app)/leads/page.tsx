import type { Metadata } from "next";
import { Leads } from "@/components/leads/Leads";
export const metadata: Metadata = { title: "Leads" };
export default function LeadsPage() { return <Leads/>; }

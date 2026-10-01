import type { Company } from "@/data/companies";
import type { PaymentPlan } from "./payment-plan";
export const stages = [
  "Novo",
  "Contatado",
  "Proposta",
  "Negociação",
  "Ganho",
  "Perdido",
] as const;
export type Stage = (typeof stages)[number];
export type LeadData = Company & {
  stage: Stage;
  value: number;
  contactAt?: string;
  description?: string;
  paymentPlan?: PaymentPlan;
  aiAnalysis?: {
    summary: string;
    opportunity: string;
    approach: string;
    nextStep: string;
    model: string;
    completedAt: string;
  };
};
export type NoteData = {
  title: string;
  content: string;
  category: string;
  color: string;
  pinned: boolean;
  date?: string;
  repeatYearly?: boolean;
};
export type EventData = {
  title: string;
  date: string;
  leadId: string;
  detail: string;
  done: boolean;
  type: string;
};
export type RecordItem<T = Record<string, unknown>> = {
  id: string;
  kind: string;
  data: T;
  createdAt: string;
  updatedAt: string;
};
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
};

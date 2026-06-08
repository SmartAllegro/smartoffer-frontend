import { apiFetch } from "./client";

export type EquipmentAnalysisData = {
  short_summary: string;
  key_features: string[];
  important_modifications: string[];
  analogs: string[];
  rfq_checklist: string[];
  supplier_questions: string[];
  selection_risks: string[];
  disclaimer: string;
};

export type EquipmentAnalysisResponse = {
  ok: boolean;
  provider: "deepseek";
  model: string;
  cached?: boolean;
  analysis: EquipmentAnalysisData | null;
  error: string | null;
};

export async function createEquipmentAnalysis(
  query: string
): Promise<EquipmentAnalysisResponse> {
  return apiFetch<EquipmentAnalysisResponse>("/ai/equipment-analysis", {
    method: "POST",
    json: { query },
  });
};

export type SupplierAnalysisData = {
  summary: string;
  contact_quality: string;
  domain_assessment: string;
  communication_status: string[];
  risk_factors: string[];
  recommended_actions: string[];
  risk_level: "low" | "medium" | "high" | "unknown";
  company_by_inn?: {
    available?: boolean;
    source_type?: string;
    inn?: string | null;
    company_name?: string | null;
    status?: string | null;
    registration_date?: string | null;
    legal_address?: string | null;
    director?: string | null;
    founders?: string[];
    main_activity?: string | null;
    financials?: string[];
    reliability_notes?: string[];
    limitations?: string | null;
  } | null;
};

export type SupplierAnalysisResponse = {
  ok: boolean;
  provider: "deepseek";
  model: string;
  result_id: number;
  cached?: boolean;
  analysis: SupplierAnalysisData | null;
  error: string | null;
};

export async function createSupplierAnalysis(
  resultId: number
): Promise<SupplierAnalysisResponse> {
  return apiFetch<SupplierAnalysisResponse>("/ai/supplier-analysis", {
    method: "POST",
    json: { result_id: resultId },
  });
}
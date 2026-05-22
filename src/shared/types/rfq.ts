export type RequestStatus =
  | "idle"
  | "searching"
  | "search_completed"
  | "sending"
  | "completed"
  | "error";

export type SupplierStatus = "found" | "sent" | "error";

export interface RFQRequest {
  id: string;
  equipment_name: string;
  rfq_text: string;
  email_subject: string;
  status: RequestStatus;
  created_at: Date;
  sent_at?: Date;
  recipients_count?: number;
  organization_id?: string;
  created_by_user_id?: string;

  // связь с бэкендом
  backend_job_id?: number;
}

export interface Supplier {
  id: string;
  request_id: string;
  supplier_name: string;
  contact: string;
  contact_status?: "email" | "site";
  contact_label?: string;
  source_url: string;
  selected: boolean;
  status: "found" | "sent" | "error";
  created_at: Date;
  backend_result_id?: number;

  error_message?: string;
  error_details?: string;
  error_code?: string;

  quote_received?: boolean;
  quote_received_at?: Date | null;

  reply_status?: SupplierReplyStatus | string;
  quote_source?: SupplierQuoteSource | string | null;
  quote_file_count?: number;
  supplier_replies_count?: number;
  last_reply_at?: Date | null;
  latest_reply?: SupplierLatestReply | null;
}

export type SupplierReplyStatus =
  | "no_reply"
  | "in_progress"
  | "quote_received"
  | "clarification_requested"
  | "declined"
  | "manual_review";

export type SupplierQuoteSource =
  | "manual"
  | "text"
  | "attachment"
  | "link";

export type SupplierReplyAttachment = {
  id: number;
  original_filename: string;
  content_type?: string | null;
  size_bytes: number;
  detected_type: string;
  uploaded_at: string;
};

export type SupplierLatestReply = {
  id: number;
  source: string;
  direction?: "supplier" | "user" | "system" | string;
  message_type?: "reply" | "quote" | "invoice" | "clarification" | "decline" | "manual_status" | string;
  affects_result_status?: boolean;
  status: SupplierReplyStatus | string;
  quote_source?: SupplierQuoteSource | string | null;
  subject?: string | null;
  body_text?: string | null;
  from_email?: string | null;
  from_name?: string | null;
  received_at?: string | null;
  created_at: string;
  attachments?: SupplierReplyAttachment[];
};
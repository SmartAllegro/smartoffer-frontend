export type RequestStatus = 'idle' | 'searching' | 'search_completed' | 'sending' | 'completed' | 'error';

export type SupplierStatus = 'found' | 'sent' | 'error';

export interface RFQRequest {
  id: string;
  equipment_name: string;
  rfq_text: string;
  email_subject: string;
  status: RequestStatus;
  created_at: Date;
  sent_at?: Date;
  recipients_count?: number;
  // Multi-tenant scaffolding (nullable for backward compatibility)
  organization_id?: string;
  created_by_user_id?: string;
}

export interface Supplier {
  id: string;
  request_id: string;
  supplier_name: string;
  contact: string;
  source_url: string;
  selected: boolean;
  status: SupplierStatus;
  created_at: Date;
  error_message?: string;
  error_details?: string;
  error_code?: string;
  // Multi-tenant scaffolding (nullable for backward compatibility)
  organization_id?: string;
  created_by_user_id?: string;
}

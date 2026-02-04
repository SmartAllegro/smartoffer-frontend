import { Supplier } from '@/types/rfq';
import { CURRENT_ORGANIZATION_ID, CURRENT_USER_ID } from '@/lib/tenantContext';

const BASE_URL = 'https://api.smartoffer.pro';

// API key for testing - exposed client-side!
// WARNING: This is only for testing purposes. For production, use a backend proxy.
const API_KEY = import.meta.env.VITE_SMARTOFFER_API_KEY || '4294c1ffe9a851a3da3d491e47f4e6b2';

interface SearchResponse {
  suppliers: Array<{
    name: string;
    email: string;
    source_url: string;
  }>;
}

interface SendRequest {
  request_id: string;
  rfq_text: string;
  email_subject: string;
  suppliers: Array<{
    id: string;
    email: string;
    name: string;
  }>;
}

interface SendResponse {
  results: Array<{
    supplier_id: string;
    status: 'sent' | 'error';
    error_message?: string;
    error_details?: string;
    error_code?: string;
  }>;
}

export async function searchSuppliersReal(
  equipmentName: string,
  requestId: string
): Promise<Supplier[]> {
  const response = await fetch(`${BASE_URL}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      equipment_name: equipmentName,
      request_id: requestId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ошибка API: ${response.status} - ${errorText}`);
  }

  const data: SearchResponse = await response.json();

  return data.suppliers.map((s, index) => ({
    id: `supplier-${requestId}-${index}`,
    request_id: requestId,
    supplier_name: s.name,
    contact: s.email,
    source_url: s.source_url,
    selected: true,
    status: 'found' as const,
    created_at: new Date(),
    organization_id: CURRENT_ORGANIZATION_ID,
    created_by_user_id: CURRENT_USER_ID,
  }));
}

interface SendResult {
  status: 'sent' | 'error';
  error_message?: string;
  error_details?: string;
  error_code?: string;
}

export async function sendRFQReal(
  requestId: string,
  rfqText: string,
  emailSubject: string,
  suppliers: Supplier[]
): Promise<Map<string, SendResult>> {
  const payload: SendRequest = {
    request_id: requestId,
    rfq_text: rfqText,
    email_subject: emailSubject,
    suppliers: suppliers.map((s) => ({
      id: s.id,
      email: s.contact,
      name: s.supplier_name,
    })),
  };

  const response = await fetch(`${BASE_URL}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ошибка отправки: ${response.status} - ${errorText}`);
  }

  const data: SendResponse = await response.json();

  const results = new Map<string, SendResult>();
  for (const r of data.results) {
    results.set(r.supplier_id, {
      status: r.status,
      error_message: r.error_message,
      error_details: r.error_details,
      error_code: r.error_code,
    });
  }

  return results;
}

// Check if real API is configured
export function isRealApiConfigured(): boolean {
  return Boolean(API_KEY);
}

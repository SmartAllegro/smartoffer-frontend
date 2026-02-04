// Unified API layer - switches between mock and real based on config
import { Supplier } from '@/types/rfq';
import { getApiMode } from './apiConfig';
import { searchSuppliers as searchSuppliersMock, sendRFQ as sendRFQMock } from './mockApi';
import { searchSuppliersReal, sendRFQReal, isRealApiConfigured } from './smartofferApi';

export async function searchSuppliers(
  equipmentName: string,
  requestId: string
): Promise<Supplier[]> {
  const mode = getApiMode();
  
  if (mode === 'real') {
    if (!isRealApiConfigured()) {
      throw new Error('Real API не настроен. Добавьте VITE_SMARTOFFER_API_KEY.');
    }
    return searchSuppliersReal(equipmentName, requestId);
  }
  
  return searchSuppliersMock(equipmentName, requestId);
}

interface SendResult {
  status: 'sent' | 'error';
  error_message?: string;
  error_details?: string;
  error_code?: string;
}

export async function sendRFQ(
  requestId: string,
  rfqText: string,
  emailSubject: string,
  suppliers: Supplier[]
): Promise<Map<string, SendResult>> {
  const mode = getApiMode();
  
  if (mode === 'real') {
    if (!isRealApiConfigured()) {
      throw new Error('Real API не настроен. Добавьте VITE_SMARTOFFER_API_KEY.');
    }
    return sendRFQReal(requestId, rfqText, emailSubject, suppliers);
  }
  
  return sendRFQMock(requestId, rfqText, emailSubject, suppliers);
}

export { getApiMode, setApiMode, toggleApiMode, type ApiMode } from './apiConfig';
export { isRealApiConfigured } from './smartofferApi';

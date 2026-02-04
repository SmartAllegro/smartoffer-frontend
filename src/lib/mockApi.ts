import { Supplier } from '@/types/rfq';
import { CURRENT_ORGANIZATION_ID, CURRENT_USER_ID } from '@/lib/tenantContext';

// Mock supplier data generator
const mockSupplierNames = [
  'Industrial Equipment Co.',
  'TechParts International',
  'Global Machinery Ltd.',
  'Precision Components Inc.',
  'Manufacturing Solutions',
  'Heavy Duty Suppliers',
  'Quality Parts Direct',
  'ProEquip Trading',
];

const mockDomains = [
  'industrialequip.com',
  'techparts-intl.com',
  'globalmachinery.net',
  'precisioncomponents.com',
  'mfgsolutions.io',
  'heavyduty-suppliers.com',
  'qualitypartsdirect.com',
  'proequip-trading.com',
];

function generateMockSuppliers(requestId: string, equipmentName: string): Supplier[] {
  const count = Math.floor(Math.random() * 4) + 3; // 3-6 suppliers
  const suppliers: Supplier[] = [];
  
  const shuffled = [...mockSupplierNames].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < count; i++) {
    const domainIndex = mockSupplierNames.indexOf(shuffled[i]);
    suppliers.push({
      id: `supplier-${Date.now()}-${i}`,
      request_id: requestId,
      supplier_name: shuffled[i],
      contact: `sales@${mockDomains[domainIndex]}`,
      source_url: `https://${mockDomains[domainIndex]}/products/${equipmentName.toLowerCase().replace(/\s+/g, '-')}`,
      selected: true,
      status: 'found',
      created_at: new Date(),
      organization_id: CURRENT_ORGANIZATION_ID,
      created_by_user_id: CURRENT_USER_ID,
    });
  }
  
  return suppliers;
}

export async function searchSuppliers(equipmentName: string, requestId: string): Promise<Supplier[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
  
  // 10% chance of error for realistic simulation
  if (Math.random() < 0.1) {
    throw new Error('Failed to fetch suppliers. Please try again.');
  }
  
  return generateMockSuppliers(requestId, equipmentName);
}

interface SendResult {
  status: 'sent' | 'error';
  error_message?: string;
  error_details?: string;
  error_code?: string;
}

const mockErrors = [
  {
    message: 'Сервер отклонил соединение',
    details: 'SMTP сервер получателя не отвечает на запросы. Возможно, сервер временно недоступен или заблокирован.',
    code: 'SMTP_CONNECTION_REFUSED'
  },
  {
    message: 'Неверный адрес электронной почты',
    details: 'Указанный email адрес не существует или был деактивирован. Проверьте корректность написания адреса.',
    code: 'INVALID_RECIPIENT'
  },
  {
    message: 'Превышен лимит отправки',
    details: 'Достигнут дневной лимит отправки писем на данный домен. Повторите попытку через 24 часа.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  {
    message: 'Таймаут соединения',
    details: 'Время ожидания ответа от почтового сервера истекло. Проверьте стабильность сетевого соединения.',
    code: 'CONNECTION_TIMEOUT'
  },
];

export async function sendRFQ(
  requestId: string,
  rfqText: string,
  emailSubject: string,
  suppliers: Supplier[]
): Promise<Map<string, SendResult>> {
  const results = new Map<string, SendResult>();
  
  // Simulate sending to each supplier with individual delays
  for (const supplier of suppliers) {
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
    
    // 15% chance of individual send failure
    const success = Math.random() > 0.15;
    
    if (success) {
      results.set(supplier.id, { status: 'sent' });
    } else {
      const errorData = mockErrors[Math.floor(Math.random() * mockErrors.length)];
      results.set(supplier.id, {
        status: 'error',
        error_message: errorData.message,
        error_details: errorData.details,
        error_code: errorData.code
      });
    }
  }
  
  return results;
}

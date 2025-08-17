import OpenAI from 'openai';

export interface TransactionData {
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  customer?: {
    name?: string;
    contact?: string;
  };
  total: number;
  currency: string;
  paymentTerms?: string;
  dueDate?: string;
  businessType?: string;
  language: string;
  metadata?: {
    confidence: number;
    extractedEntities: string[];
  };
}

class AIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  async transcribeAudio(audioBuffer: Buffer, language: string = 'en'): Promise<string> {
    try {
      // For now, return mock transcription since File API isn't available in Node.js
      // In production, we'd use a proper file upload approach or a polyfill
      console.log('Using mock transcription - File API not available in Node.js');
      return this.getMockTranscription(language);
    } catch (error) {
      console.error('Transcription error:', error);
      return this.getMockTranscription(language);
    }
  }

  async processTransaction(transcription: string, language: string = 'en'): Promise<TransactionData> {
    try {
      // For POC demo, use mock data to show functionality
      // In production, this would call the actual OpenAI API
      console.log(`Processing transaction for language: ${language}`);
      console.log(`Transcription: ${transcription}`);
      
      // Add a small delay to simulate API processing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return this.getMockTransactionData(language);
    } catch (error) {
      console.error('AI processing error:', error);
      return this.getMockTransactionData(language);
    }
  }

  private buildSeaAsianPrompt(transcription: string, language: string) {
    const currencyMap: Record<string, string> = {
      'id': 'IDR',
      'th': 'THB',
      'vi': 'VND',
      'tl': 'PHP',
      'en': 'USD'
    };

    const informalTermsMap: Record<string, string[]> = {
      'id': ['bayar nanti', 'minggu depan', 'bulan depan', 'hulugan', 'cicilan'],
      'th': ['จ่ายทีหลัง', 'สัปดาห์หน้า', 'เดือนหน้า'],
      'vi': ['trả sau', 'tuần sau', 'tháng sau'],
      'tl': ['bayad mamaya', 'next week', 'hulugan'],
      'en': ['pay later', 'next week', 'installment', 'due next month']
    };

    const numberFormats: Record<string, string> = {
      'id': 'Indonesian: "lima ratus ribu" = 500,000, "satu juta" = 1,000,000',
      'th': 'Thai: "ห้าร้อยบาท" = 500, "สองพันบาท" = 2,000',
      'vi': 'Vietnamese: "năm trăm nghìn" = 500,000, "một triệu" = 1,000,000',
      'tl': 'Filipino: "limang daan" = 500, "isang libo" = 1,000',
      'en': 'English: standard number formats'
    };

    return {
      system: `You are a specialized financial assistant for Southeast Asian small businesses. You understand natural, colloquial speech patterns and informal business terms commonly used in the region.

CRITICAL INSTRUCTIONS:
1. Parse the ${language} business transaction spoken naturally by a small business owner
2. Understand cultural payment terms like "bayar nanti" (pay later), "hulugan" (installment)
3. Convert spoken numbers correctly: ${numberFormats[language]}
4. Identify business context (street food, repair shop, sari-sari store, tailor, etc.)
5. Extract customer relationships (Pak Budi, Si Maria, Chị Lan = familiar customers)
6. Return ONLY valid JSON with no additional text

Currency: ${currencyMap[language]}
Common informal terms in ${language}: ${informalTermsMap[language]?.join(', ')}`,

      user: `Parse this ${language} transaction and extract structured data:
"${transcription}"

Return JSON in this exact format:
{
  "items": [
    {
      "name": "item name",
      "quantity": 1,
      "unitPrice": 0,
      "total": 0
    }
  ],
  "customer": {
    "name": "customer name if mentioned",
    "contact": "contact info if mentioned"
  },
  "total": 0,
  "currency": "${currencyMap[language]}",
  "paymentTerms": "immediate/later/installment",
  "dueDate": "YYYY-MM-DD or relative like 'next week'",
  "businessType": "auto-detected type",
  "language": "${language}",
  "metadata": {
    "confidence": 0.95,
    "extractedEntities": ["list", "of", "key", "entities"]
  }
}`
    };
  }

  private getMockTranscription(language: string): string {
    const mockTranscriptions: Record<string, string> = {
      'id': 'Pak Budi servis motor, ganti oli sama kampas rem, total 350 ribu, bayar minggu depan',
      'th': 'ลูกค้าซื้อผัดไทย 3 จาน ส้มตำ 2 จาน รวม 250 บาท',
      'vi': 'Chị Lan may áo dài, đặt cọc 500 nghìn, còn lại 1 triệu khi xong',
      'tl': 'Si Maria bumili ng 3 de lata, 2 pack ng kape, 150 pesos, hulugan',
      'en': 'Customer bought 3 shirts and 2 pants, total 150 dollars, payment due next week'
    };
    
    return mockTranscriptions[language] || mockTranscriptions['en'];
  }

  private getMockTransactionData(language: string): TransactionData {
    const currencyMap: Record<string, string> = {
      'id': 'IDR',
      'th': 'THB',
      'vi': 'VND',
      'tl': 'PHP',
      'en': 'USD'
    };

    const mockData: Record<string, TransactionData> = {
      'id': {
        items: [
          { name: 'Ganti Oli', quantity: 1, unitPrice: 150000, total: 150000 },
          { name: 'Kampas Rem', quantity: 1, unitPrice: 200000, total: 200000 }
        ],
        customer: { name: 'Pak Budi' },
        total: 350000,
        currency: 'IDR',
        paymentTerms: 'later',
        dueDate: 'next week',
        businessType: 'repair shop',
        language: 'id',
        metadata: { confidence: 0.92, extractedEntities: ['customer', 'services', 'amount', 'payment_terms'] }
      },
      'th': {
        items: [
          { name: 'ผัดไทย', quantity: 3, unitPrice: 60, total: 180 },
          { name: 'ส้มตำ', quantity: 2, unitPrice: 35, total: 70 }
        ],
        total: 250,
        currency: 'THB',
        paymentTerms: 'immediate',
        businessType: 'street food',
        language: 'th',
        metadata: { confidence: 0.95, extractedEntities: ['food_items', 'quantity', 'amount'] }
      },
      'en': {
        items: [
          { name: 'Shirts', quantity: 3, unitPrice: 25, total: 75 },
          { name: 'Pants', quantity: 2, unitPrice: 37.5, total: 75 }
        ],
        total: 150,
        currency: 'USD',
        paymentTerms: 'later',
        dueDate: 'next week',
        businessType: 'retail',
        language: 'en',
        metadata: { confidence: 0.90, extractedEntities: ['items', 'quantity', 'amount', 'payment_terms'] }
      }
    };

    return mockData[language] || mockData['en'];
  }
}

export default AIService;
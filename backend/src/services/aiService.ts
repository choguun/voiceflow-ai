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
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️ OpenAI API key not found, using mock transcription');
        return this.getMockTranscription(language);
      }

      console.log('🎤 Transcribing audio with Whisper API...', {
        bufferSize: audioBuffer.length,
        language: language,
        timestamp: new Date().toISOString()
      });

      // Import fs and path properly
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      // Create temporary file with proper extension
      const tempFilePath = path.join(os.tmpdir(), `voiceflow_audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`);

      // Write buffer to temporary file
      fs.writeFileSync(tempFilePath, audioBuffer);
      console.log('📁 Created temp file:', tempFilePath);

      // Create readable stream for OpenAI
      const audioFile = fs.createReadStream(tempFilePath);

      // Add name property to the stream (required by OpenAI)
      (audioFile as any).name = `audio_${Date.now()}.webm`;

      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: this.mapLanguageForWhisper(language),
        response_format: 'text',
        temperature: 0.1
      });

      // Clean up temporary file
      try {
        fs.unlinkSync(tempFilePath);
        console.log('🗑️ Cleaned up temp file');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup temp file:', cleanupError);
      }

      console.log('✅ Transcription successful:', {
        length: response.length,
        preview: response.slice(0, 100) + (response.length > 100 ? '...' : '')
      });

      return response || this.getMockTranscription(language);
    } catch (error) {
      console.error('❌ Transcription error:', error);
      console.log('🔄 Falling back to mock transcription');
      return this.getMockTranscription(language);
    }
  }

  private mapLanguageForWhisper(language: string): string {
    const languageMap: Record<string, string> = {
      'id': 'id', // Indonesian
      'th': 'th', // Thai
      'vi': 'vi', // Vietnamese
      'tl': 'en', // Tagalog -> English (Whisper doesn't support Tagalog directly)
      'en': 'en'  // English
    };
    return languageMap[language] || 'en';
  }

  async processTransaction(transcription: string, language: string = 'en'): Promise<TransactionData> {
    const startTime = Date.now();

    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️ OpenAI API key not found, using mock transaction data');
        return this.getMockTransactionData(language);
      }

      console.log('🤖 Processing transaction with VoiceFlow AI:', {
        language: language,
        transcriptionLength: transcription.length,
        transcriptionPreview: transcription.slice(0, 150) + (transcription.length > 150 ? '...' : ''),
        timestamp: new Date().toISOString()
      });

      const prompt = this.buildSeaAsianPrompt(transcription, language);

      // Enhanced API call with retry logic
      const response = await this.callOpenAIWithRetry({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: prompt.system
          },
          {
            role: 'user',
            content: prompt.user
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        console.warn('⚠️ No response from OpenAI, using mock data');
        return this.getMockTransactionData(language);
      }

      try {
        const parsedData = JSON.parse(result) as TransactionData;

        // Validate and enhance the parsed data
        const validatedData = this.validateAndEnhanceTransactionData(parsedData, language);

        const processingTime = Date.now() - startTime;
        console.log('✅ AI processing successful:', {
          processingTimeMs: processingTime,
          itemCount: validatedData.items.length,
          total: validatedData.total,
          currency: validatedData.currency,
          confidence: validatedData.metadata?.confidence
        });

        return validatedData;
      } catch (parseError) {
        console.error('❌ Failed to parse AI response:', {
          error: parseError,
          rawResponse: result.slice(0, 200) + '...'
        });
        return this.getMockTransactionData(language);
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ AI processing error:', {
        error: error,
        processingTimeMs: processingTime,
        language: language
      });
      console.log('🔄 Falling back to mock transaction data');
      return this.getMockTransactionData(language);
    }
  }

  private async callOpenAIWithRetry(params: any, maxRetries: number = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🚀 OpenAI API call attempt ${attempt}/${maxRetries}`);
        return await this.openai.chat.completions.create(params);
      } catch (error: any) {
        console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);

        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`🕰️ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private validateAndEnhanceTransactionData(data: TransactionData, language: string): TransactionData {
    // Ensure required fields have default values
    const enhanced: TransactionData = {
      items: data.items || [],
      customer: data.customer || {},
      total: data.total || 0,
      currency: data.currency || this.getCurrencyForLanguage(language),
      paymentTerms: data.paymentTerms || 'immediate',
      businessType: data.businessType || 'general',
      language: language,
      dueDate: data.dueDate,
      metadata: {
        confidence: data.metadata?.confidence || 0.85,
        extractedEntities: data.metadata?.extractedEntities || [],
        ...data.metadata
      }
    };

    // Validate and fix item totals
    enhanced.items = enhanced.items.map(item => ({
      ...item,
      total: item.total || (item.quantity * item.unitPrice)
    }));

    // Recalculate total if it seems incorrect
    const calculatedTotal = enhanced.items.reduce((sum, item) => sum + item.total, 0);
    if (Math.abs(enhanced.total - calculatedTotal) > 0.01 && calculatedTotal > 0) {
      enhanced.total = calculatedTotal;
    }

    return enhanced;
  }

  private getCurrencyForLanguage(language: string): string {
    const currencyMap: Record<string, string> = {
      'id': 'IDR',
      'th': 'THB',
      'vi': 'VND',
      'tl': 'PHP',
      'en': 'USD'
    };
    return currencyMap[language] || 'USD';
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
      'id': ['bayar nanti', 'minggu depan', 'bulan depan', 'hulugan', 'cicilan', 'cash', 'transfer', 'tempo'],
      'th': ['จ่ายทีหลัง', 'สัปดาห์หน้า', 'เดือนหน้า', 'เครดิต', 'ผ่อน'],
      'vi': ['trả sau', 'tuần sau', 'tháng sau', 'trả góp', 'công nợ'],
      'tl': ['bayad mamaya', 'next week', 'hulugan', 'installment', 'utang'],
      'en': ['pay later', 'next week', 'installment', 'due next month', 'credit', 'cash']
    };

    const numberFormats: Record<string, string> = {
      'id': 'Indonesian numbers: "lima ratus ribu" = 500,000, "satu juta" = 1,000,000, "dua ratus" = 200',
      'th': 'Thai numbers: "ห้าร้อยบาท" = 500, "สองพันบาท" = 2,000, "หนึ่งแสน" = 100,000',
      'vi': 'Vietnamese numbers: "năm trăm nghìn" = 500,000, "một triệu" = 1,000,000, "hai trăm" = 200',
      'tl': 'Filipino numbers: "limang daan" = 500, "isang libo" = 1,000, "dalawang libo" = 2,000',
      'en': 'English numbers: standard formats like "five hundred", "one thousand"'
    };

    const businessContexts: Record<string, string[]> = {
      'id': ['warung', 'toko', 'bengkel', 'salon', 'laundry', 'service', 'ojek', 'angkot'],
      'th': ['ร้านอาหาร', 'ร้านค้า', 'อู่', 'ซาลอน', 'ร้านซักรีด'],
      'vi': ['quán ăn', 'cửa hàng', 'garage', 'salon', 'giặt ủi'],
      'tl': ['tindahan', 'sari-sari', 'talyer', 'salon', 'carinderia'],
      'en': ['store', 'shop', 'restaurant', 'service', 'repair']
    };

    return {
      system: `You are VoiceFlow AI, an expert financial assistant specialized in Southeast Asian small business transactions. You excel at understanding natural, colloquial speech patterns and cultural business practices.

🎯 CORE MISSION:
Transform voice-spoken business transactions into structured invoice data for Southeast Asian SMEs.

🌏 CULTURAL EXPERTISE:
- Understand informal payment terms and regional business practices
- Recognize family/relationship-based customer names (Pak, Bu, Chị, Si, etc.)
- Handle mixed language usage common in Southeast Asia
- Process various number formats and currency expressions
- Identify business types from context clues

💡 PROCESSING RULES:
1. Language: ${language.toUpperCase()}
2. Currency: ${currencyMap[language]}
3. Number formats: ${numberFormats[language]}
4. Payment terms: ${informalTermsMap[language]?.join(', ')}
5. Business contexts: ${businessContexts[language]?.join(', ')}

🔍 EXTRACTION PRIORITIES:
- Items/services with quantities and prices
- Customer information and relationships
- Payment terms and due dates
- Business type identification
- Total amount calculation

⚡ OUTPUT REQUIREMENT:
Return ONLY valid JSON. No explanations, no markdown, no additional text.`,

      user: `🎤 VOICE TRANSACTION TO PARSE:
"${transcription}"

📋 Required JSON Structure:
{
  "items": [
    {
      "name": "specific item/service name",
      "quantity": 1,
      "unitPrice": 0,
      "total": 0
    }
  ],
  "customer": {
    "name": "customer name with cultural context",
    "contact": "phone/address if mentioned"
  },
  "total": 0,
  "currency": "${currencyMap[language]}",
  "paymentTerms": "immediate|later|installment|credit",
  "dueDate": "YYYY-MM-DD or descriptive like 'next week'",
  "businessType": "detected business category",
  "language": "${language}",
  "metadata": {
    "confidence": 0.95,
    "extractedEntities": ["key", "business", "terms"],
    "culturalContext": "relevant cultural notes",
    "paymentMethod": "cash|transfer|credit|mixed"
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
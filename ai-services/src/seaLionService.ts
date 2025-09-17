import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

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

class SeaLionService {
  private openai: OpenAI;
  private fallbackToGPT: boolean = true;
  private cache: Map<string, { data: TransactionData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });

    console.log('🦁 SEA-LION Service initialized with VoiceFlow AI integration');
  }

  async processVoiceTransaction(
    transcription: string,
    language: string = 'en'
  ): Promise<TransactionData> {
    const cacheKey = `${language}-${this.hashString(transcription)}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('🚀 Cache hit for transaction processing');
      return cached;
    }

    try {
      console.log('🦁 Attempting SEA-LION processing for VoiceFlow AI...');
      const result = await this.processWithSEALion(transcription, language);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('⚠️ SEA-LION processing failed, falling back to GPT-4:', error);

      if (this.fallbackToGPT) {
        const result = await this.processWithGPT4(transcription, language);
        this.setCache(cacheKey, result);
        return result;
      }

      throw error;
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getFromCache(key: string): TransactionData | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key); // Remove expired cache
    }
    return null;
  }

  private setCache(key: string, data: TransactionData): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean up old cache entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if ((now - value.timestamp) > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  private async processWithSEALion(
    transcription: string,
    language: string
  ): Promise<TransactionData> {
    // For now, SEA-LION API is not publicly available
    // This would be the integration point for actual SEA-LION API
    console.log('🚧 SEA-LION API integration placeholder');
    console.log('📝 Transcription:', transcription.slice(0, 100) + '...');
    console.log('🌏 Language:', language);

    throw new Error('🦁 SEA-LION API not available in POC phase - using GPT-4 fallback');
  }

  private async processWithGPT4(
    transcription: string, 
    language: string
  ): Promise<TransactionData> {
    const prompt = this.buildSeaAsianPrompt(transcription, language);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
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
      response_format: { type: 'json_object' }
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from AI service');
    }

    try {
      return JSON.parse(result) as TransactionData;
    } catch (parseError) {
      console.error('Failed to parse AI response:', result);
      throw new Error('Invalid AI response format');
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

  async transcribeAudio(audioBuffer: Buffer, language: string = 'en'): Promise<string> {
    try {
      console.log('🎤 VoiceFlow AI transcribing audio with SEA-LION service...');

      // Import fs modules properly for Node.js environment
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      // Create temporary file for OpenAI Whisper
      const tempFilePath = path.join(os.tmpdir(), `voiceflow_sealion_${Date.now()}.webm`);
      fs.writeFileSync(tempFilePath, audioBuffer);

      // Create readable stream
      const audioFile = fs.createReadStream(tempFilePath);
      (audioFile as any).name = 'audio.webm';

      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: language === 'tl' ? 'en' : language,
        response_format: 'text',
        temperature: 0.1
      });

      // Cleanup
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError);
      }

      console.log('✅ SEA-LION transcription successful');
      return response;
    } catch (error) {
      console.error('❌ SEA-LION transcription error:', error);
      throw new Error('Failed to transcribe audio with SEA-LION service');
    }
  }
}

export default SeaLionService;
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import crypto from 'crypto';
import AIService from './services/aiService';
import InvoiceService from './services/invoiceService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const aiService = new AIService();
const invoiceService = new InvoiceService();

// API Statistics tracking
const apiStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageProcessingTime: 0,
  lastRequestTime: null as Date | null
};

console.log('🎆 VoiceFlow AI Backend starting up...');
console.log('🔑 OpenAI API Key status:', process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

// CORS configuration with env-based allowlist and Vercel wildcard support
const parseAllowedOrigins = (): string[] => {
  const envList = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '';
  const list = envList
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (!list.includes('http://localhost:5173')) list.push('http://localhost:5173');
  if (!list.includes('http://localhost:5174')) list.push('http://localhost:5174');
  return list;
};

const allowedOrigins = parseAllowedOrigins();
const vercelRegex = /^https?:\/\/[a-z0-9-]+\.vercel\.app$/i;

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g., curl, server-side)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (vercelRegex.test(origin)) return callback(null, true);
    console.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['x-request-id'],
  credentials: true,
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Minimal security headers without extra deps
app.use((_, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  next();
});

// Simple request ID + timing logger
app.use((req, res, next) => {
  const id = crypto.randomUUID();
  (req as any).id = id;
  res.setHeader('x-request-id', id);
  const startedAt = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    console.log(`[${id}] ${req.method} ${req.originalUrl} -> ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Lightweight in-memory rate limiter
const rlWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const rlMax = Number(process.env.RATE_LIMIT_MAX || 60);
const rlStore = new Map<string, number[]>();
app.use('/api/', (req, res, next) => {
  const key = (req.ip || 'global') + ':' + (req.path.split('/')[2] || 'root');
  const now = Date.now();
  const windowStart = now - rlWindowMs;
  const arr = rlStore.get(key) || [];
  const recent = arr.filter(ts => ts > windowStart);
  recent.push(now);
  rlStore.set(key, recent);
  if (recent.length > rlMax) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again shortly.'
    });
  }
  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'VoiceFlow AI Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: {
      openai: !!process.env.OPENAI_API_KEY,
      whisper: !!process.env.OPENAI_API_KEY,
      gpt4: !!process.env.OPENAI_API_KEY
    },
    stats: apiStats
  });
});

// New API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    service: 'VoiceFlow AI',
    status: 'operational',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    stats: apiStats,
    endpoints: {
      health: '/api/health',
      voiceProcess: '/api/voice/process',
      invoiceGenerate: '/api/invoice/generate',
      test: '/api/test'
    }
  });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.post('/api/voice/process', upload.single('audio'), async (req, res) => {
  const startTime = Date.now();
  apiStats.totalRequests++;
  apiStats.lastRequestTime = new Date();

  try {
    // Enhanced request validation
    const { language = 'en' } = req.body;
    const audioFile = req.file;

    // Validate language parameter
    const supportedLanguages = ['en', 'id', 'th', 'vi', 'tl'];
    if (!supportedLanguages.includes(language)) {
      apiStats.failedRequests++;
      return res.status(400).json({
        error: 'Invalid language',
        message: `Language '${language}' not supported. Supported languages: ${supportedLanguages.join(', ')}`,
        supportedLanguages
      });
    }

    // Validate audio file
    if (!audioFile) {
      apiStats.failedRequests++;
      return res.status(400).json({
        error: 'No audio file provided',
        message: 'Audio file is required for voice processing'
      });
    }

    // Validate file size and type
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (audioFile.size > maxFileSize) {
      apiStats.failedRequests++;
      return res.status(400).json({
        error: 'File too large',
        message: `Audio file must be smaller than ${maxFileSize / (1024 * 1024)}MB`
      });
    }

    const validMimeTypes = ['audio/webm', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg'];
    if (audioFile.mimetype && !validMimeTypes.includes(audioFile.mimetype)) {
      console.warn(`⚠️ Unexpected MIME type: ${audioFile.mimetype}, proceeding anyway`);
    }

    console.log(`🎤 Processing audio: ${audioFile.size} bytes, language: ${language}, type: ${audioFile.mimetype}`);

    // Step 1: Transcribe audio with timeout
    const transcriptionTimeout = Number(process.env.TRANSCRIBE_TIMEOUT_MS || 30000);
    const transcriptionPromise = aiService.transcribeAudio(audioFile.buffer, language);
    const transcription = await Promise.race([
      transcriptionPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Transcription timeout')), transcriptionTimeout)
      )
    ]) as string;

    console.log('✅ Transcription completed:', transcription.slice(0, 100) + '...');

    // Step 2: Process transaction data with timeout
    const processingTimeout = Number(process.env.PROCESS_TIMEOUT_MS || 45000);
    const processingPromise = aiService.processTransaction(transcription, language);
    const transactionData = await Promise.race([
      processingPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Transaction processing timeout')), processingTimeout)
      )
    ]) as any;

    console.log('✅ Transaction processing completed:', {
      items: transactionData.items?.length || 0,
      total: transactionData.total,
      currency: transactionData.currency
    });

    // Step 3: Generate invoice with error handling
    const invoiceData = await invoiceService.generateInvoice(transactionData, transactionData.businessType || 'general');
    const invoiceHTML = invoiceService.generateInvoiceHTML(invoiceData);

    const processingTime = Date.now() - startTime;
    apiStats.successfulRequests++;
    apiStats.averageProcessingTime =
      (apiStats.averageProcessingTime * (apiStats.successfulRequests - 1) + processingTime) / apiStats.successfulRequests;

    console.log(`🎉 Voice processing completed successfully in ${processingTime}ms`);

    res.json({
      success: true,
      transcription,
      transactionData,
      invoiceData,
      invoiceHTML,
      processingTime,
      metadata: {
        language,
        audioSize: audioFile.size,
        audioType: audioFile.mimetype,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    apiStats.failedRequests++;

    console.error('❌ Voice processing error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
      timestamp: new Date().toISOString()
    });

    // Enhanced error response based on error type
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return res.status(408).json({
          error: 'Request timeout',
          message: 'Processing took too long. Please try with a shorter audio file.',
          processingTime,
          retryable: true
        });
      }

      if (error.message.includes('API key') || error.message.includes('authentication')) {
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          message: 'AI service is currently unavailable. Please try again later.',
          processingTime,
          retryable: true
        });
      }

      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please wait a moment before trying again.',
          processingTime,
          retryable: true
        });
      }
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during voice processing',
      processingTime,
      retryable: true,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/invoice/generate', async (req, res) => {
  const startTime = Date.now();
  apiStats.totalRequests++;
  apiStats.lastRequestTime = new Date();

  try {
    const { transactionData, businessType = 'general' } = req.body;

    // Enhanced validation for transaction data
    if (!transactionData) {
      apiStats.failedRequests++;
      return res.status(400).json({
        error: 'Transaction data is required',
        message: 'Please provide transaction data to generate an invoice'
      });
    }

    // Validate transaction data structure
    if (typeof transactionData !== 'object') {
      apiStats.failedRequests++;
      return res.status(400).json({
        error: 'Invalid transaction data',
        message: 'Transaction data must be a valid object'
      });
    }

    // Validate required fields
    const requiredFields = ['items', 'total', 'currency'];
    const missingFields = requiredFields.filter(field => !(field in transactionData));
    if (missingFields.length > 0) {
      apiStats.failedRequests++;
      return res.status(400).json({
        error: 'Missing required fields',
        message: `Transaction data is missing: ${missingFields.join(', ')}`,
        requiredFields
      });
    }

    // Validate items array
    if (!Array.isArray(transactionData.items) || transactionData.items.length === 0) {
      apiStats.failedRequests++;
      return res.status(400).json({
        error: 'Invalid items',
        message: 'Transaction data must include at least one item'
      });
    }

    // Validate business type
    const validBusinessTypes = ['general', 'restaurant', 'retail', 'service', 'repair', 'salon', 'food', 'transport'];
    if (businessType && !validBusinessTypes.includes(businessType)) {
      console.warn(`⚠️ Unknown business type: ${businessType}, using 'general'`);
    }

    console.log(`📋 Generating invoice: ${transactionData.items.length} items, ${transactionData.total} ${transactionData.currency}, type: ${businessType}`);

    // Generate invoice with timeout
    const invoiceTimeout = Number(process.env.INVOICE_TIMEOUT_MS || 15000);
    const invoicePromise = invoiceService.generateInvoice(transactionData, businessType);
    const invoiceData = await Promise.race([
      invoicePromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Invoice generation timeout')), invoiceTimeout)
      )
    ]) as any;

    console.log('✅ Invoice data generated:', {
      invoiceNumber: invoiceData.invoiceNumber,
      items: invoiceData.items?.length || 0,
      total: invoiceData.total
    });

    // Generate HTML with timeout
    const htmlTimeout = Number(process.env.HTML_TIMEOUT_MS || 10000);
    const htmlPromise = invoiceService.generateInvoiceHTML(invoiceData);
    const invoiceHTML = await Promise.race([
      htmlPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('HTML generation timeout')), htmlTimeout)
      )
    ]) as string;

    const processingTime = Date.now() - startTime;
    apiStats.successfulRequests++;
    apiStats.averageProcessingTime =
      (apiStats.averageProcessingTime * (apiStats.successfulRequests - 1) + processingTime) / apiStats.successfulRequests;

    console.log(`🎉 Invoice generated successfully in ${processingTime}ms`);

    res.json({
      success: true,
      invoiceData,
      invoiceHTML,
      processingTime,
      metadata: {
        businessType,
        itemCount: transactionData.items.length,
        currency: transactionData.currency,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    apiStats.failedRequests++;

    console.error('❌ Invoice generation error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
      timestamp: new Date().toISOString()
    });

    // Enhanced error response based on error type
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return res.status(408).json({
          error: 'Request timeout',
          message: 'Invoice generation took too long. Please try again.',
          processingTime,
          retryable: true
        });
      }

      if (error.message.includes('template') || error.message.includes('format')) {
        return res.status(400).json({
          error: 'Invalid data format',
          message: 'Transaction data format is not compatible with invoice generation',
          processingTime,
          retryable: false
        });
      }
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during invoice generation',
      processingTime,
      retryable: true,
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`VoiceFlow AI Backend running on port ${PORT}`);
});
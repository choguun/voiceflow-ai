import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import AIService from './services/aiService';
import InvoiceService from './services/invoiceService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
// Temporarily commented out to test server startup
// const aiService = new AIService();
// const invoiceService = new InvoiceService();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'VoiceFlow AI Backend is running' });
});

app.post('/api/voice/process', upload.single('audio'), async (req, res) => {
  try {
    const { language = 'en' } = req.body;
    const audioFile = req.file;

    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log(`Processing audio: ${audioFile.size} bytes, language: ${language}`);

    // Temporarily return mock data
    res.json({
      success: true,
      transcription: 'Mock transcription for testing',
      transactionData: { mock: 'data' },
      invoiceData: { mock: 'invoice' },
      invoiceHTML: '<html><body>Mock Invoice</body></html>',
      processingTime: Date.now()
    });
  } catch (error) {
    console.error('Voice processing error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/invoice/generate', async (req, res) => {
  try {
    const { transactionData, businessType = 'general' } = req.body;

    if (!transactionData) {
      return res.status(400).json({ error: 'Transaction data is required' });
    }

    // Temporarily return mock data
    res.json({
      success: true,
      invoiceData: { mock: 'invoice data' },
      invoiceHTML: '<html><body>Mock Generated Invoice</body></html>'
    });
  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`VoiceFlow AI Backend running on port ${PORT}`);
});
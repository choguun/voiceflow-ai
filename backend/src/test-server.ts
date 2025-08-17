import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Test server running' });
});

app.post('/api/test', (req, res) => {
  res.json({ success: true, message: 'Test endpoint working' });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('Server should stay alive now...');
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

console.log('Script completed, but server should be listening...');
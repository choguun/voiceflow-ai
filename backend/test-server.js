const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'JavaScript test server running' });
});

app.listen(PORT, () => {
  console.log(`JavaScript test server running on port ${PORT}`);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

console.log('Server script loaded...');
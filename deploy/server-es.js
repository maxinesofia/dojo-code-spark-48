// ES Module compatible server
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import express from 'express';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/projects', (req, res) => {
  res.json({ projects: [] });
});

app.post('/api/projects', (req, res) => {
  res.json({ message: 'Project creation not implemented yet' });
});

app.get('/api/files', (req, res) => {
  res.json({ files: [] });
});

app.post('/api/execution', (req, res) => {
  res.json({ message: 'Code execution not implemented yet' });
});

// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting Tutorials Dojo API Server...');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'production'}`);
      console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

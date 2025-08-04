import express from 'express';
import { join } from 'path';
import { initializeDatabase } from './db';
import { registerRoutes } from './routes';
import { xrayManager } from './xray';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files from client
app.use(express.static(join(process.cwd(), 'client', 'dist')));

async function startServer() {
  try {
    console.log('🚀 Starting Xray SOCKS5 Management System...');
    
    // Initialize database
    await initializeDatabase();
    
    // Download and setup Xray if needed
    await xrayManager.downloadXray();
    
    // Start Xray-core
    await xrayManager.start();
    
    // Register routes
    const server = await registerRoutes(app);
    
    // Serve React app for all other routes
    app.get('*', (req, res) => {
      res.sendFile(join(process.cwd(), 'client', 'dist', 'index.html'));
    });
    
    // Start server
    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log('✅ Server started successfully');
      console.log(`🌐 Web interface: http://localhost:${PORT}`);
      console.log(`🔗 SOCKS5 proxy: localhost:1080`);
      console.log(`🔑 Default login: admin / admin123`);
      console.log(`🔑 Default SOCKS5 user: testuser / testpass`);
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`❌ Port ${PORT} is already in use. Stopping conflicting process...`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', err);
        process.exit(1);
      }
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 Shutting down gracefully...');
      await xrayManager.stop();
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
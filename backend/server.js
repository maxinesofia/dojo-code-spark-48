const http = require('http');
const app = require('./app');
const config = require('./config/config');
const sequelize = require('./database/database');
const { User, Project, File } = require('./models');
const terminalController = require('./controllers/terminalController');

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync database models (be careful in production)
    if (config.environment === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synchronized.');
    }
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Initialize WebSocket server for terminals
    terminalController.initializeWebSocketServer(server);
    console.log('✅ Terminal WebSocket server initialized');
    
    // Start the server
    server.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📱 Environment: ${config.environment}`);
      console.log(`🔗 API: http://localhost:${config.port}/api`);
      console.log(`🖥️  Terminal WebSocket: ws://localhost:${config.port}/terminal`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received. Shutting down gracefully...');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

startServer();
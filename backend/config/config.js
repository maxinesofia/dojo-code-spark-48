require('dotenv').config();

module.exports = {
  environment: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000, // Changed from 3000 to 5000
  
  database: {
    // For quick local start fallback to sqlite if PG not installed
    dialect: process.env.DB_DIALECT || 'sqlite',
    storage: process.env.SQLITE_FILE || ':memory:',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'tutorials_dojo',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  },
  
  docker: {
    image: process.env.DOCKER_IMAGE || 'node:18-alpine',
    timeout: parseInt(process.env.DOCKER_TIMEOUT) || 30000,
    memoryLimit: process.env.DOCKER_MEMORY_LIMIT || '128m'
  },
  
  uploads: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/json']
  },
  
  terminal: {
    workspaceDir: process.env.WORKSPACE_DIR || './workspaces',
    maxSessions: parseInt(process.env.MAX_TERMINAL_SESSIONS) || 10,
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 30 * 60 * 1000, // 30 minutes
    cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL) || 5 * 60 * 1000 // 5 minutes
  }
};
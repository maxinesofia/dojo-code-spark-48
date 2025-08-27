require('dotenv').config();

module.exports = {
  environment: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  
  database: {
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  files: {
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    maxFileSize: process.env.MAX_FILE_SIZE || 10485760 // 10MB
  },

  execution: {
    timeout: process.env.EXECUTION_TIMEOUT || 30000, // 30 seconds
    maxMemory: process.env.MAX_MEMORY || '128m'
  }
};

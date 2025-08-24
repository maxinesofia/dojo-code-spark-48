let sequelize = null;
try {
  const { Sequelize } = require('sequelize');
  const config = require('../config/config');
  const dialect = config.database.dialect;
  if (dialect === 'sqlite') {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: config.database.storage || ':memory:',
      logging: config.environment === 'development' ? console.log : false,
      define: { underscored: true, freezeTableName: false }
    });
  } else {
    sequelize = new Sequelize(
      config.database.name,
      config.database.username,
      config.database.password,
      {
        host: config.database.host,
        port: config.database.port,
        dialect,
        logging: config.environment === 'development' ? console.log : false,
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
        define: { underscored: true, freezeTableName: false }
      }
    );
  }
} catch (e) {
  console.warn('[DB] Sequelize or dialect dependency missing. Running in NO-DB mode. Reason:', e.message);
  sequelize = {
    authenticate: async () => console.log('[DB] authenticate skipped (NO-DB mode)'),
    sync: async () => console.log('[DB] sync skipped (NO-DB mode)'),
    close: async () => console.log('[DB] close skipped (NO-DB mode)'),
    define: (name, schema) => {
      // Return a stub model for NO-DB mode
      const stub = {
        hasMany: () => stub,
        belongsTo: () => stub,
        create: async () => ({ id: 1, ...schema }),
        findAll: async () => [],
        findByPk: async () => null,
        findOne: async () => null,
        update: async () => [1],
        destroy: async () => 1
      };
      return stub;
    }
  };
}

module.exports = sequelize;
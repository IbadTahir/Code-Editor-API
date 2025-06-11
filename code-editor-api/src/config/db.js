const { Sequelize } = require('sequelize');
const path = require('path');

// Create SQLite database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: false // Set to console.log to see SQL queries
});

const connectDB = async () => {
  try {    await sequelize.authenticate();
    console.log('SQLite Database Connected');
    // Force sync all models - This will drop and recreate tables
    await sequelize.sync({ force: true });
    console.log('Database models synchronized');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CodeSession = sequelize.define('CodeSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  language: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'javascript'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  output: {
    type: DataTypes.TEXT,
    defaultValue: ''
  }
}, {
  timestamps: true // This will automatically add createdAt and updatedAt fields
});

module.exports = CodeSession;

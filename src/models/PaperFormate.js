const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PaperFormate = sequelize.define('PaperFormate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  headerConfig: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  questionStyle: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'paper_formats',
  timestamps: true
});

module.exports = PaperFormate;
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const School = sequelize.define('School', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  logo: {
    type: DataTypes.STRING,  // Store logo file path
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  mobileNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

School.belongsTo(User, { 
  foreignKey: 'createdBy',
  as: 'creator',
  targetKey: 'id'
});

module.exports = School;
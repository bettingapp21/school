const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Board extends Model {}

Board.init({
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'Board'
});

module.exports = Board;
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Subject extends Model {}

Subject.init({
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  boardId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'Subject',
  indexes: [
    {
      unique: true,
      fields: ['name', 'boardId']
    }
  ]
});

module.exports = Subject;
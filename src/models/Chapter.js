const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Chapter extends Model {}

Chapter.init({
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'Chapter',
  indexes: [
    {
      unique: true,
      fields: ['name', 'subjectId']
    }
  ]
});

module.exports = Chapter;
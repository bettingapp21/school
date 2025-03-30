const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class PaperQuestions extends Model {}

PaperQuestions.init({
  paperId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Papers',
      key: 'id'
    }
  },
  questionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Questions',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('MCQ', 'SHORT', 'LONG'),
    allowNull: false
  },
  marks: {
    type: DataTypes.FLOAT,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'PaperQuestions',
  tableName: 'PaperQuestions'
});

module.exports = PaperQuestions;
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PaperQuestion = sequelize.define('PaperQuestion', {
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
    type: DataTypes.STRING,
    allowNull: false
  },
  marks: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

module.exports = PaperQuestion;
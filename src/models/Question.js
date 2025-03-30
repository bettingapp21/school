const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Question extends Model {}

Question.init({
  board: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  class: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  subject: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  chapter: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  questionType: {
    type: DataTypes.ENUM('MCQ', 'SHORT', 'LONG'),
    allowNull: false
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  questionImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  options: {
    type: DataTypes.JSON,
    allowNull: true
  },
  optionImages: {
    type: DataTypes.JSON,
    allowNull: true
  },
  answer: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  answerImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  marks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    allowNull: false,
    defaultValue: 'easy'
  }
}, {
  sequelize,
  modelName: 'Questions'
});

// Define the association
Question.associate = (models) => {
  Question.belongsToMany(models.Paper, {
    through: 'PaperQuestions',
    foreignKey: 'questionId',
    as: 'papers'
  });
};

module.exports = Question;
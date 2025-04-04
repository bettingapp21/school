const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Question = require('./Question');

class Paper extends Model {}

Paper.init({
  board: {
    type: DataTypes.STRING,
    allowNull: false
  },
  class: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  language: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subjects: {
    type: DataTypes.JSON,
    allowNull: false
  },
  chapters: {
    type: DataTypes.JSON,
    allowNull: false
  },
  difficulty: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mcqCount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  shortCount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  longCount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  totalMarks: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  schoolName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  schoolLogo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  examName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  examDate: {
    type: DataTypes.STRING,
    allowNull: true
  },
  duration: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pdfPath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  answerKeyPath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mcqMarks: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  shortMarks: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  longMarks: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  difficultyDistribution: {
    type: DataTypes.STRING,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'Papers'
});

Paper.associate = (models) => {
  Paper.belongsToMany(Question, {
    through: 'PaperQuestions',
    foreignKey: 'paperId',
    as: 'questions'
  });
};

module.exports = Paper;
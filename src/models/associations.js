const Paper = require('./paper');
const Question = require('./Question');

// Define associations with unique aliases
Paper.belongsToMany(Question, {
  through: 'PaperQuestions',
  as: 'questions',
  foreignKey: 'paperId'
});

Question.belongsToMany(Paper, {
  through: 'PaperQuestions',
  as: 'questionPapers', // Changed from 'papers' to 'questionPapers'
  foreignKey: 'questionId'
});

module.exports = { Paper, Question };
const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const auth = require('../middleware/auth');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', authMiddleware, questionController.createQuestion); // Updated method name
router.post('/bulkCreateQuestions', authMiddleware, questionController.bulkCreateQuestions); // Updated method name
router.get('/', authMiddleware, questionController.getPapers);
router.put('/slider/:id', authMiddleware, questionController.togglePaperStatus);
router.get('/filter', authMiddleware, questionController.getPapersByFilter);
router.get('/subjects/:board/:class', authMiddleware, questionController.getSubjects);
router.get('/chapters/:board/:subject', authMiddleware, questionController.getChapters);

// New routes for question list
router.get('/questions', authMiddleware, questionController.getQuestionsByBoard);
router.get('/subjects/:board', authMiddleware, questionController.getSubjectsByBoard);
router.get('/chapters/:board/:subject', authMiddleware, questionController.getChaptersBySubject);

// Add this route to your existing routes
router.put('/:id', authMiddleware, upload.fields([
  { name: 'questionImage', maxCount: 1 },
  { name: 'answerImage', maxCount: 1 },
  { name: 'optionImages', maxCount: 4 }
]), questionController.updateQuestion);
module.exports = router;
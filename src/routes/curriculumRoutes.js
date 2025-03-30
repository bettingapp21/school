const express = require('express');
const router = express.Router();
const curriculumController = require('../controllers/curriculumController');
const auth = require('../middleware/auth');

// Board routes
router.post('/boards', auth, curriculumController.addBoard);
router.get('/boards', auth, curriculumController.getBoards);

// Subject routes
router.post('/subjects', auth, curriculumController.addSubject);
router.get('/boards/:boardId/subjects', auth, curriculumController.getSubjects);

// Chapter routes
router.post('/chapters', auth, curriculumController.addChapter);
router.get('/subjects/:subjectId/chapters', auth, curriculumController.getChapters);

module.exports = router;
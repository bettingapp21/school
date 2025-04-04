const express = require('express');
const router = express.Router();
const paperController = require('../controllers/paperController');
const auth = require('../middleware/auth');

router.post('/generate-paper', auth, paperController.generatePaper);
router.post('/generate-only-paper', auth, paperController.generateOnlyPaper);
router.get('/getPaper', auth, paperController.getPapers);
router.get('/getPaperById/:id', auth, paperController.getPaperById);
router.get('/deletePaper/:userId', auth, paperController.deletePaper);
router.get('/downloadPaper/:id/:includeAnswers', auth, paperController.downloadPaper);
router.post('/save-format', auth, paperController.savePaperFormate);
router.get('/formats', auth, paperController.getPaperFormats);

module.exports = router;
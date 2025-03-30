const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const auth = require('../middleware/auth');

router.post('/createSchool', auth, schoolController.createSchool);
router.get('/getSchool', auth, schoolController.getSchools);
router.get('/getSchoolsByUser', auth, schoolController.getSchoolsByUser);
router.get('/getAllSchools/:search?', auth, schoolController.getAllSchools); // Updated route with optional search parameter
router.put('/:id', auth, schoolController.updateSchool);
router.delete('/:id', auth, schoolController.deleteSchool);

module.exports = router;
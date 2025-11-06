const express = require('express');
const router = express.Router();
const multer = require('multer');
const eventController = require('../controllers/eventController');
const { checkAuth } = require('../middleware/authMiddleware');

const upload = multer({ dest: 'uploads/' });

router.use(checkAuth); 

router.get('/:eventId', eventController.getManagementPage);
router.post('/:eventId/settings', eventController.updateSettings);
router.post('/:eventId/start-session', eventController.startSession);
router.get('/:eventId/session/:sessionId', eventController.getSessionReport);
router.post('/:eventId/upload-students', upload.single('studentsCsv'), eventController.uploadStudents);

module.exports = router;
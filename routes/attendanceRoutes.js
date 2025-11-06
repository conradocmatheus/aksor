const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { checkAuth } = require('../middleware/authMiddleware'); // Importe

router.get('/', (req, res) => res.redirect('/login'));

router.post('/create-event', checkAuth, require('../controllers/eventController').createEvent);
router.get('/check-in/:token', attendanceController.getCheckinPage);
router.post('/register-attendance', attendanceController.registerAttendance);

module.exports = router;
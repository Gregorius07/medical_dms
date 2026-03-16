const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { verifyToken } = require('../middleware/authMiddleware'); // Pastikan path middleware Anda benar

router.get('/inbox', verifyToken, approvalController.getInbox);
router.get('/outbox', verifyToken, approvalController.getOutbox);
router.get('/history', verifyToken, approvalController.getHistory);

module.exports = router;
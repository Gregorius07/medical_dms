const express = require('express');
const router = express.Router();
const PositionController = require('../controllers/positionController');
const {verifyToken} = require('../middleware/authMiddleware');

// Definisi Route
router.get('/', verifyToken, PositionController.findAll);
router.post('/', verifyToken, PositionController.create);
router.put('/:id', verifyToken, PositionController.update);
router.delete('/:id', verifyToken, PositionController.delete);

module.exports = router;
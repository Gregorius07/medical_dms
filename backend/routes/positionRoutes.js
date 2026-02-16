const express = require('express');
const router = express.Router();
const PositionController = require('../controllers/positionController');
const { requireAdmin } = require('../middlewares/authMiddleware');

// Definisi Route
router.get('/', PositionController.findAll);
router.post('/', requireAdmin,PositionController.create);
router.put('/:id', requireAdmin,PositionController.update);
router.delete('/:id', requireAdmin,PositionController.delete);

module.exports = router;
const express = require('express');
const router = express.Router();
const PositionController = require('../controllers/positionController');

// Definisi Route
router.get('/', PositionController.findAll);
router.post('/',PositionController.create);
router.put('/:id',PositionController.update);
router.delete('/:id',PositionController.delete);

module.exports = router;
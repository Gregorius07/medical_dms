const express = require('express');
const router = express.Router();
const DepartmentController = require('../controllers/departmentController');

// Definisi Route
router.get('/', DepartmentController.findAll);
router.post('/', DepartmentController.create);
router.put('/:id', DepartmentController.update);
router.delete('/:id',DepartmentController.delete);

module.exports = router;
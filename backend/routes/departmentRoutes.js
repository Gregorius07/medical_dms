const express = require('express');
const router = express.Router();
const DepartmentController = require('../controllers/departmentController');
const { requireAdmin } = require('../middlewares/authMiddleware');

// Definisi Route
router.get('/', DepartmentController.findAll);
router.post('/',requireAdmin, DepartmentController.create);
router.put('/:id',requireAdmin, DepartmentController.update);
router.delete('/:id', requireAdmin,DepartmentController.delete);

module.exports = router;
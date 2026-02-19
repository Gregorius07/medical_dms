const express = require('express');
const router = express.Router();
const DepartmentController = require('../controllers/departmentController');
const {verifyToken} = require('../middleware/authMiddleware');
// Definisi Route
router.get('/', verifyToken, DepartmentController.findAll);
router.post('/', verifyToken, DepartmentController.create);
router.put('/:id', verifyToken, DepartmentController.update);
router.delete('/:id',verifyToken, DepartmentController.delete);

module.exports = router;
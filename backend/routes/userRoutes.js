const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const {verifyToken} = require('../middleware/authMiddleware');

router.get('/', verifyToken, UserController.findAll);
router.post('/', verifyToken, UserController.create);
router.put('/:id', verifyToken, UserController.update);
router.delete('/:id', verifyToken, UserController.delete);

module.exports = router;
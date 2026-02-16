const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { requireAdmin } = require('../middlewares/authMiddleware');

router.get('/', UserController.findAll);
router.post('/',requireAdmin, UserController.create);
router.put('/:id', requireAdmin,UserController.update);
router.delete('/:id', requireAdmin,UserController.delete);

module.exports = router;
const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController')
const {verifyToken} = require('../middleware/authMiddleware');

// Definisi Route
router.get('/', verifyToken, folderController.getFolderContents);
router.post('/:id/breadcrumbs', verifyToken,folderController.getFolderBreadcrumbs);
router.post('/getdraft',verifyToken,folderController.getDraftFolderByUserId);
module.exports = router;
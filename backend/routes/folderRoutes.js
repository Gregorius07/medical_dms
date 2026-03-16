const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController')
const {verifyToken} = require('../middleware/authMiddleware');
const {requirePermission} = require('../middleware/permissionMiddleware');

// Definisi Route
router.post('/', verifyToken, requirePermission('preview', 'FOLDER'), folderController.getFolderContents);
router.post('/:id/breadcrumbs', verifyToken, requirePermission('preview', 'FOLDER'), folderController.getFolderBreadcrumbs);
router.post('/getdraft',verifyToken,folderController.getDraftFolderByUserId);
router.get('/getaccesiblefolders', verifyToken, folderController.getAccessibleFoldersId);
router.post('/create', verifyToken, folderController.createFolder);
router.delete('/:id', verifyToken, folderController.deleteFolder)
module.exports = router;
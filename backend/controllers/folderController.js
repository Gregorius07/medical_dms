const FolderModel = require('../models/folderModel');
const DocumentModel = require ('../models/documentModel');
const PermissionModel = require('../models/permissionModel');

const getFolderContents = async (req, res) => {
    try {
        const parentId = req.query.parentId || null; 
        const userId = req.userId; // Dari middleware verifyToken

        let folders = [];
        let documents = [];

        // KONDISI 1: User di halaman depan (Dashboard Root)
        if (!parentId) {
            // Ambil semua folder dan dokumen yang dizinkan dari tabel permission
            folders = await FolderModel.getAccessibleFolders(userId);
            console.log('Isi variabel folders:',folders);
            
            documents = await DocumentModel.getAccessibleDocuments(userId);
            console.log('Isi variabel documents:',documents);
            
        } 
        // KONDISI 2: User sedang menelusuri isi di dalam sebuah folder
        else {
            // Ambil sub-folder dan dokumen murni berdasarkan parentId
            // (Catatan: Akses ke sini sudah dilindungi oleh middleware 'checkPermission' di routes)
            folders = await FolderModel.getSubFolders(parentId);
            documents = await DocumentModel.getDocumentsInFolder(parentId);
        }

        res.json({
            currentFolderId: parentId,
            folders: folders,
            documents: documents
        });

    } catch (error) {
        console.error("Error getFolderContents:", error);
        res.status(500).json({ message: "Gagal mengambil data folder dan dokumen" });
    }
};
const getFolderBreadcrumbs = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Panggil Model untuk mengeksekusi Recursive CTE
        const breadcrumbs = await FolderModel.getBreadcrumbs(id);
        
        res.json(breadcrumbs);

    } catch (error) {
        console.error("Error getFolderBreadcrumbs:", error);
        res.status(500).json({ message: "Gagal mengambil breadcrumbs" });
    }
};

const getDraftFolderByUserId = async (req,res) =>{
    try {
        const result = await FolderModel.getDraftFolderByUserId(Number(req.userId));
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil draft" });
    }
}

const getAccessibleFoldersId = async (req,res) =>{
    try {
        const result = await FolderModel.getAccessibleFolders(req.userId);
        res.json(result.map(item => item.id_folder));
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil accesible folder" });
    }
}

const createFolder = async (req, res) => {
    try {
        const { folder_name, parent_folder } = req.body;
        const userId = req.userId; // Dari token JWT
        const name = req.name;
        if (!folder_name) {
            return res.status(400).json({ message: "Nama folder tidak boleh kosong" });
        }

        const newFolderId = await FolderModel.createFolder(folder_name, parent_folder || null, userId, name);

        res.status(201).json({ 
            message: "Folder berhasil dibuat", 
            id_folder: newFolderId 
        });
    } catch (error) {
        console.error("Error creating folder:", error);
        res.status(500).json({ message: "Gagal membuat folder baru" });
    }
};

module.exports = {
    getFolderContents,
    getFolderBreadcrumbs,
    getDraftFolderByUserId,
    getAccessibleFoldersId,
    createFolder
};
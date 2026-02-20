const FolderModel = require('../models/folderModel');

const getFolderContents = async (req, res) => {
    try {
        const parentId = req.query.parentId || null; 

        // Controller tinggal menyuruh Model bekerja, tidak perlu tahu bahasa SQL
        const folders = await FolderModel.getSubFolders(parentId);
        const documents = await FolderModel.getDocumentsInFolder(parentId);

        res.json({
            currentFolderId: parentId,
            folders: folders,
            documents: documents
        });

    } catch (error) {
        console.error("Error getFolderContents:", error);
        res.status(500).json({ message: "Gagal mengambil isi folder" });
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

module.exports = {
    getFolderContents,
    getFolderBreadcrumbs
};
const FolderModel = require("../models/folderModel");
const DocumentModel = require("../models/documentModel");
const PermissionModel = require("../models/permissionModel");
const pool = require("../config/db");

const getFolderContents = async (req, res) => {
  try {
    const parentId = req.query.parentId || null;
    const userId = req.userId; // Dari middleware verifyToken
    const name = req.name;
    let folders = [];
    let documents = [];
    let parentFolderDetail = {};
    let currentFolderPermission = {};
    // KONDISI 1: User di halaman depan (Root)
    if (!parentId) {
      // Ambil semua folder dan dokumen yang dizinkan dari tabel permission
      // console.log(userId);
      if (req.role === "admin") {
        folders = await FolderModel.getAllRootFoldersForAdmin();
        documents = await DocumentModel.getDocumentsInRootForAdmin();
      } else {
        folders = await FolderModel.getAccessibleFolders(userId, name);
        // console.log("Isi variabel folders:", folders);
        documents = await DocumentModel.getAccessibleDocuments(userId, name);
        // console.log('Isi variabel documents:',documents);
        parentFolderDetail = await FolderModel.getFolderDetail(parentId);
        currentFolderPermission = await PermissionModel.getAllPermissionsForFolder(userId, parentId);
      }
    }
    // KONDISI 2: User sedang menelusuri isi di dalam sebuah folder
    else {
      // Ambil sub-folder dan dokumen murni berdasarkan parentId
      // (Catatan: Akses ke sini sudah dilindungi oleh middleware 'checkPermission' di routes)
      folders = await FolderModel.getSubFolders(parentId);
      documents = await DocumentModel.getDocumentsInFolder(parentId);
      parentFolderDetail = await FolderModel.getFolderDetail(parentId);
      currentFolderPermission = await PermissionModel.getAllPermissionsForFolder(userId, parentId);
    }

    
    res.json({
      currentFolderId: parentId,
      currentFolderMetadata : parentFolderDetail? parentFolderDetail.metadata_schema : [], 
      currentFolderPermission : currentFolderPermission? currentFolderPermission : {},
      folders: folders,
      documents: documents,
    });
  } catch (error) {
    console.error("Error getFolderContents:", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil data folder dan dokumen" });
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

const getDraftFolderByUserId = async (req, res) => {
  try {
    const result = await FolderModel.getDraftFolderByFullname(req.name);
    // console.log("result di controller", result);

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil draft" });
  }
};

const getAccessibleFoldersId = async (req, res) => {
  try {
    const result = await FolderModel.getAccessibleFolders(req.userId);
    res.json(result.map((item) => item.id_folder));
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil accesible folder" });
  }
};

const createFolder = async (req, res) => {
  try {
    const client = await pool.connect();
    const { folder_name, parent_folder, metadata_schema } = req.body;
    const userId = req.userId;
    const name = req.name;
    if (!folder_name) {
      return res
        .status(400)
        .json({ message: "Nama folder tidak boleh kosong" });
    }

    console.log("Metadata dari view = ",JSON.stringify(metadata_schema));
    
    const newFolderId = await FolderModel.createFolder(
      folder_name,
      parent_folder || null,
      userId,
      name,
      metadata_schema ? JSON.stringify(metadata_schema) : null,
      client,
    );

    console.log(newFolderId);
    

    res.status(201).json({
      message: "Folder berhasil dibuat",
      id_folder: newFolderId,
    });
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({ message: "Gagal membuat folder baru" });
  }
};

const deleteFolder = async (req, res) => {
    try {
        await FolderModel.deleteFolder(req.params.id);
        res.status(200).json({ message: "Folder berhasil dihapus secara permanen." });
    } catch (error) {
        // Jika error berasal dari validasi kita (folder tidak kosong)
        if (error.message.includes("tidak kosong")) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Gagal menghapus folder." });
    }
};

const getFolderMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const metadata = await FolderModel.getFolderMetadata(id);
    res.json(metadata);
  } catch (error) {
    console.error("Error getFolderMetadata:", error);
    res.status(500).json({ message: "Gagal mengambil metadata folder" });
  }
}

const updateFolderMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const { folder_name, metadata_schema } = req.body;

    if (!folder_name || !folder_name.trim()) {
      return res.status(400).json({ message: "Nama folder tidak boleh kosong" });
    }

    if (
      metadata_schema !== null &&
      metadata_schema !== undefined &&
      typeof metadata_schema !== "object"
    ) {
      return res.status(400).json({
        message: "metadata_schema harus berupa object atau null",
      });
    }

    const updatedFolder = await FolderModel.updateFolderMetadata(
      id,
      folder_name.trim(),
      metadata_schema ?? null,
    );

    if (!updatedFolder) {
      return res.status(404).json({ message: "Folder tidak ditemukan" });
    }

    res.status(200).json({
      message: "Metadata folder berhasil diperbarui",
      data: updatedFolder,
    });
  } catch (error) {
    console.error("Error updateFolderMetadata:", error);
    res.status(500).json({ message: "Gagal memperbarui metadata folder" });
  }
};
// Jangan lupa export dan daftarkan di folderRoutes.js (router.delete('/:id', ...))

module.exports = {
  getFolderContents,
  getFolderBreadcrumbs,
  getDraftFolderByUserId,
  getAccessibleFoldersId,
  createFolder,
  getFolderMetadata,
  updateFolderMetadata,
  deleteFolder,
};

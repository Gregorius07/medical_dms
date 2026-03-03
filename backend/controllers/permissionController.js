const PermissionModel = require('../models/permissionModel');
const AuditModel = require('../models/auditModel'); // Jika ingin mencatat log admin

const getFolderAccessList = async (req, res) => {
    try {
        const list = await PermissionModel.getAccessList(req.params.id, 'FOLDER');
        res.json(list);
    } catch (error) {
        console.error("Error get folder access:", error);
        res.status(500).json({ message: "Gagal memuat daftar akses folder" });
    }
};

const getDocumentAccessList = async (req, res) => {
    try {
        const list = await PermissionModel.getAccessList(req.params.id, 'DOCUMENT');
        res.json(list);
    } catch (error) {
        console.error("Error get document access:", error);
        res.status(500).json({ message: "Gagal memuat daftar akses dokumen" });
    }
};

const grantAccess = async (req, res) => {
    try {
        const creatorName = req.name;
        const { full_name, resourceId, resourceType, permissions } = req.body;
        
        // Opsional: Pastikan hanya Admin atau Pemilik yang bisa melakukan ini
        // if (req.userRole !== 'admin') return res.status(403).json({ message: "Akses ditolak" });

        await PermissionModel.grantAccess(full_name, resourceId, resourceType, permissions, creatorName);
        res.status(200).json({ message: "Hak akses berhasil diperbarui." });
    } catch (error) {
        console.error("Error grant access:", error);
        // Tangkap error kustom jika user tidak ditemukan
        if (error.message.includes("tidak ditemukan")) {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: "Gagal memperbarui hak akses." });
    }
};

const revokeAccess = async (req, res) => {
    try {
        const idPermission = req.params.id;
        await PermissionModel.revokeAccess(idPermission);
        res.status(200).json({ message: "Hak akses berhasil dicabut." });
    } catch (error) {
        console.error("Error revoke access:", error);
        res.status(500).json({ message: "Gagal mencabut hak akses." });
    }
};

module.exports = {
    getFolderAccessList,
    getDocumentAccessList,
    grantAccess,
    revokeAccess
};
const PermissionModel = require ('../models/permissionModel');
const pool = require ('../config/db');

const requirePermission = (action, resourceType) => {
    return async (req, res, next) => {
        try {
            const userId = req.userId; 
            
            // 1. CEK ADMIN
            const adminQuery = await pool.query(`SELECT is_admin FROM "user" WHERE id_user = $1`, [userId]);
            if (adminQuery.rows[0]?.is_admin) {
                return next(); 
            }

            // 2. KUMPULKAN ID MENJADI ARRAY 
            let resourceIds = [];

            if (req.body.id_folder && Array.isArray(req.body.id_folder)) {
                resourceIds = req.body.id_folder;
            } else if (req.body.id_document && Array.isArray(req.body.id_document)) {
                resourceIds = req.body.id_document;
            } else if (req.params.id) {
                resourceIds.push(req.params.id);
            } else if (req.body.id_folder) {
                resourceIds.push(req.body.id_folder);
            } else if (req.body.id_document) {
                resourceIds.push(req.body.id_document);
            } 
            // TAMBAHAN BARU: Tangkap parameter dari URL Query (?parentId=...)
            else if (req.query.parentId) { 
                resourceIds.push(req.query.parentId);
            }

            // 3. LOGIKA BYPASS UNTUK HALAMAN ROOT (DEPAN)
            if (resourceIds.length === 0) {
                // Jika tidak ada ID sama sekali, berarti user sedang meminta Root Dashboard
                // Loloskan saja, karena Controller 'getAccessibleFolders' sudah memfilter izinnya dengan aman.
                return next(); 
            }
            
            // console.log(resourceIds);
            
            // 4. CEK AKSES KE DATABASE
            const hasAccess = await PermissionModel.checkMultipleAccess(userId, resourceIds, resourceType, action);
            // console.log(hasAccess);
            
            if (!hasAccess) {
                console.warn(`[SECURITY] User ${userId} mencoba aksi ${action} pada ${resourceType} [${resourceIds.join(', ')}] tanpa izin.`);
                return res.status(403).json({ 
                    message: `Akses ditolak. Anda tidak memiliki izin untuk ${action}.` 
                });
            }

            next();

        } catch (error) {
            console.error("Error pada permission middleware:", error);
            res.status(500).json({ message: "Terjadi kesalahan saat memverifikasi hak akses." });
        }
    };
};
module.exports = { requirePermission };
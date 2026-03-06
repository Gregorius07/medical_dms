const PermissionModel = require ('../models/permissionModel');
const pool = require ('../config/db');

const requirePermission = (action, resourceType) => {
    return async (req, res, next) => {
        try {
            // console.log("PERMISSION MIDDLEWARE, USER ID:", userId);
            
            // cek apakah admin?
            const userId = req.userId; 
            const adminQuery = await pool.query(`SELECT is_admin FROM "user" WHERE id_user = $1`, [userId]);
            if (adminQuery.rows[0]?.is_admin) {
                return next(); 
            }

            // kumpulin id resource ke array
            let resourceIds = [];

            if (req.id_folder && Array.isArray(req.id_folder)) {
                resourceIds = req.id_folder;
            } else if (req.id_document && Array.isArray(req.id_document)) {
                resourceIds = req.id_document;
            } else if (req.params.id) {
                resourceIds.push(req.params.id);
            } else if (req.id_folder) {
                resourceIds.push(req.id_folder);
            } else if (req.id_document) {
                resourceIds.push(req.id_document);
            } 
            // tangkap param parentid=?
            else if (req.query.parentId) { 
                resourceIds.push(req.query.parentId);
            }

            // kalau root
            if (resourceIds.length === 0) {
                // jika tidak ada ID sama sekali, berarti user sedang meminta Root
                // lolos, karena Controller 'getAccessibleFolders' sudah memfilter izinnya.
                return next(); 
            }
            
            // console.log(resourceIds);
            
            // cek permission ke database
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
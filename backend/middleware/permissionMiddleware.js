const PermissionModel = require ('../models/permissionModel');
const pool = require ('../config/db');

/*
  Contoh data yang diproses middleware ini sebelum permission dicek:

  req.userId = 12
  req.role = "user"
  req.params.id = "45"
  req.query.parentId = undefined

  Contoh pemanggilan:
  requirePermission("preview", "DOCUMENT")

  Artinya:
  - user dengan id 12 sedang mencoba preview dokumen 45
  - middleware akan cek apakah user ini admin
  - jika bukan admin, middleware akan cek permission ke tabel permission
*/
const requirePermission = (action, resourceType) => {
    return async (req, res, next) => {
        try {
            // Ambil id user dari middleware auth sebelumnya.
            const userId = req.userId; 

            // Admin selalu lolos, karena hak aksesnya dianggap penuh.
            const adminQuery = await pool.query(`SELECT is_admin FROM "user" WHERE id_user = $1`, [userId]);
            if (adminQuery.rows[0]?.is_admin) {
                return next(); 
            }

            // Kumpulkan resource ID ke array agar bisa dicek satu atau banyak sekaligus.
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

            // Kalau tidak ada resource ID, berarti request kemungkinan ke Root.
            // Dalam kasus ini, controller biasanya sudah memfilter data yang boleh dilihat.
            if (resourceIds.length === 0) {
                return next(); 
            }
            
            // Cek permission ke database untuk semua resource yang diminta.
            const hasAccess = await PermissionModel.checkMultipleAccess(userId, resourceIds, resourceType, action);
            
            // Jika tidak punya akses, request ditolak.
            if (!hasAccess) {
                console.warn(`[SECURITY] User ${userId} mencoba aksi ${action} pada ${resourceType} [${resourceIds.join(', ')}] tanpa izin.`);
                return res.status(403).json({ 
                    message: `Akses ditolak. Anda tidak memiliki izin untuk ${action}.` 
                });
            }

            // Lolos permission, lanjut ke controller berikutnya.
            next();

        } catch (error) {
            console.error("Error pada permission middleware:", error);
            res.status(500).json({ message: "Terjadi kesalahan saat memverifikasi hak akses." });
        }
    };
};
module.exports = { requirePermission };
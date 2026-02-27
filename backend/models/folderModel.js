const pool = require('../config/db');

class FolderModel {
    // 1. Ambil daftar sub-folder
    static async getSubFolders(parentId) {
        let query = `SELECT * FROM folder WHERE parent_folder IS NULL ORDER BY folder_name ASC`;
        let params = [];

        if (parentId) {
            query = `SELECT * FROM folder WHERE parent_folder = $1 ORDER BY folder_name ASC`;
            params = [parentId];
        }

        const { rows } = await pool.query(query, params);
        return rows;
    }

    

    // 3. Ambil breadcrumbs (seluruh isi folder tersebut)
    static async getBreadcrumbs(folderId) {
        const query = `
            WITH RECURSIVE folder_tree AS (
                SELECT id_folder, folder_name, parent_folder, 1 AS level
                FROM folder
                WHERE id_folder = $1
                
                UNION ALL
                
                SELECT f.id_folder, f.folder_name, f.parent_folder, ft.level + 1
                FROM folder f
                JOIN folder_tree ft ON f.id_folder = ft.parent_folder
            )
            SELECT id_folder, folder_name 
            FROM folder_tree 
            ORDER BY level DESC;
        `;
        const { rows } = await pool.query(query, [folderId]);
        return rows;
    }

    static async createFolder(folderName, createdBy, parentFolder = null, client) {
        const query = `
            INSERT INTO folder (folder_name, metadata_schema, created_by, parent_folder)
            VALUES ($1, $2, $3, $4)
            RETURNING id_folder, folder_name;
        `;
        // metadata_schema kita isi '{}' (kosong) sebagai default untuk folder draft
        const metadataSchema = {}; 
        
        const { rows } = await client.query(query, [folderName, metadataSchema, createdBy, parentFolder?? null]);
        return rows[0]; // Mengembalikan data folder yang baru dibuat (termasuk id_folder-nya)
    }

    static async getDraftFolderByUserId(idUser) {
        const query = `
            SELECT f.* FROM folder f
            JOIN permission p ON f.id_folder = p.id_folder
            WHERE p.id_user = $1 
              AND p.resource_type = 'FOLDER' 
              AND f.parent_folder IS NULL
              AND f.folder_name LIKE 'Draft - %'
            LIMIT 1;
        `;

        try {
            // $1 akan digantikan dengan nilai idUser
            const { rows } = await pool.query(query, [idUser]);
            
            // Mengembalikan baris pertama (objek folder) jika ada, jika tidak kembalikan null
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error("Ralat pada getDraftFolderByUserId:", error);
            throw error; // Melempar ralat supaya boleh ditangkap (catch) oleh Controller
        }
    }

    // 1. Ambil SEMUA folder yang user punya hak akses (termasuk Draft)
    static async getAccessibleFolders(userId) {
        const query = `
            SELECT f.id_folder, f.folder_name, f.parent_folder, 
                   p.preview, p.upload, p.download, p.edit_metadata
            FROM folder f
            JOIN permission p ON f.id_folder = p.id_folder
            WHERE p.id_user = $1 
              AND p.resource_type = 'FOLDER' 
              AND p.preview = TRUE
            ORDER BY 
                -- Trik agar folder Draft selalu di urutan paling atas
                CASE WHEN f.folder_name LIKE 'Draft - %' THEN 0 ELSE 1 END, 
                f.folder_name ASC;
        `;
        const { rows } = await pool.query(query, [userId]);
        return rows;
    }

    /**
     * Membuat folder baru dan otomatis memberikan permission penuh kepada pembuatnya
     */
    static async createFolder(folderName, parentId, userId, name) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN'); // Mulai Transaksi

            // 1. Insert ke tabel folder
            const insertFolderQuery = `
                INSERT INTO folder (folder_name, parent_folder, created_by)
                VALUES ($1, $2, $3)
                RETURNING id_folder;
            `;
            const folderResult = await client.query(insertFolderQuery, [folderName, parentId, name]);
            const newFolderId = folderResult.rows[0].id_folder;

            // 2. Insert ke tabel permission (Beri hak akses penuh ke pembuatnya)
            const insertPermissionQuery = `
                INSERT INTO permission (id_user, id_folder, resource_type, preview, upload, download, edit_metadata, created_at, created_by)
                VALUES ($1, $2, 'FOLDER', TRUE, TRUE, TRUE, TRUE, NOW(), $3);
            `;
            await client.query(insertPermissionQuery, [userId, newFolderId, name]);

            await client.query('COMMIT'); // Simpan Permanen
            return newFolderId;
        } catch (error) {
            await client.query('ROLLBACK'); // Batalkan jika terjadi error
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = FolderModel;
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
        const metadataSchema = JSON.stringify({}); 
        
        const { rows } = await client.query(query, [folderName, metadataSchema, createdBy, parentFolder]);
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
}

module.exports = FolderModel;
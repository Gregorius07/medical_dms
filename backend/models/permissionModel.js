const pool = require("../config/db");

class PermissionModel {
  // Memberi all access ke user
  static async createFolderPermission(idUser, idFolder, createdBy, client) {
    const query = `
            INSERT INTO permission 
            (preview, download, upload, edit_metadata, resource_type, created_at, created_by, id_user, id_folder)
            VALUES 
            (TRUE, TRUE, TRUE, TRUE, 'FOLDER', NOW(), $1, $2, $3)
            RETURNING id_permission;
        `;
    const { rows } = await client.query(query, [createdBy, idUser, idFolder]);
    return rows[0];
  }

  // Mencari tahu Draft milik user
  static async getUserDraftFolder(idUser) {
    const query = `
            SELECT p.id_folder, f.folder_name 
            FROM permission p
            JOIN folder f ON p.id_folder = f.id_folder
            WHERE p.id_user = $1 
              AND p.resource_type = 'FOLDER' 
              AND f.parent_folder IS NULL
              AND f.folder_name LIKE 'Draft - %'
            LIMIT 1;
        `; //resource = FOLDER dan nama folder = Draft - ...
    const { rows } = await pool.query(query, [idUser]);
    return rows[0];
  }

  /**
   * Mengecek apakah user memiliki hak akses tertentu pada sebuah resource
   * @param {number} idUser - ID User yang sedang login
   * @param {number} resourceId - ID Folder atau ID Dokumen
   * @param {string} resourceType - 'FOLDER' atau 'DOCUMENT'
   * @param {string} action - 'preview', 'download', 'upload', atau 'edit_metadata'
   * @returns {boolean} - true jika diizinkan, false jika ditolak
   */
  static async checkAccess(idUser, resourceId, resourceType, action) {
    const validActions = ["preview", "download", "upload", "edit_metadata"];
    if (!validActions.includes(action)) throw new Error("Aksi tidak valid");

    let query;
    let params;

    if (resourceType === "FOLDER") {
      // Pengecekan normal untuk Folder (Apakah punya akses ke folder ini?)
      query = `
                SELECT ${action} 
                FROM permission 
                WHERE id_user = $1 AND id_folder = $2 AND resource_type = 'FOLDER'
                LIMIT 1;
            `;
      params = [idUser, resourceId];

      const { rows } = await pool.query(query, params);
      return rows.length > 0 ? rows[0][action] : false;
    } else if (resourceType === "DOCUMENT") {
      // PENGECEKAN PEWARISAN UNTUK DOKUMEN (Level Skripsi!)
      // Cek permission langsung di dokumen, ATAU di folder tempat dokumen itu berada
      query = `
                SELECT 
                    COALESCE(p_doc.${action}, p_folder.${action}, FALSE) as has_access
                FROM document d
                -- Cari permission langsung di level dokumen
                LEFT JOIN permission p_doc ON p_doc.id_document = d.id_document AND p_doc.id_user = $1
                -- Cari permission di level folder induknya
                LEFT JOIN permission p_folder ON p_folder.id_folder = d.id_folder AND p_folder.id_user = $1
                WHERE d.id_document = $2;
            `;
      params = [idUser, resourceId];

      const { rows } = await pool.query(query, params);
      return rows.length > 0 ? rows[0].has_access : false;
    }
  }

  static async checkMultipleAccess(idUser, resourceIds, resourceType, action) {
    const validActions = ["preview", "download", "upload", "edit_metadata"];
    if (!validActions.includes(action)) throw new Error("Aksi tidak valid");

    // Hilangkan duplikat ID jika frontend tidak sengaja mengirim ID ganda
    const uniqueIds = [...new Set(resourceIds)];

    let query;
    let params;

    if (resourceType === "FOLDER") {
      // Untuk Folder: Cek langsung karena folder tidak mewarisi dari dokumen
      query = `
                SELECT COUNT(DISTINCT id_folder) as granted_count
                FROM permission 
                WHERE id_user = $1 
                  AND resource_type = 'FOLDER' 
                  AND id_folder = ANY($2::int[]) 
                  AND ${action} = TRUE;
            `;
      params = [idUser, uniqueIds];
    } else if (resourceType === "DOCUMENT") {
      // Untuk Dokumen: Cek permission di level dokumen ATAU di level folder induknya secara massal
      query = `
                SELECT COUNT(DISTINCT d.id_document) as granted_count
                FROM document d
                LEFT JOIN permission p_doc 
                  ON p_doc.id_document = d.id_document AND p_doc.id_user = $1
                LEFT JOIN permission p_folder 
                  ON p_folder.id_folder = d.id_folder AND p_folder.id_user = $1
                WHERE d.id_document = ANY($2::int[])
                  AND (p_doc.${action} = TRUE OR p_folder.${action} = TRUE);
            `;
      params = [idUser, uniqueIds];
    }

    const { rows } = await pool.query(query, params);

    // Jika jumlah dokumen/folder yang diizinkan SAMA dengan jumlah ID yang diminta, maka TRUE (Lolos Semua)
    return parseInt(rows[0].granted_count) === uniqueIds.length;
  }

  /**
   * Mengambil SEMUA status permission untuk satu dokumen spesifik bagi seorang user
   * dengan menerapkan logika pewarisan (Inheritance) dari folder induk.
   */
  static async getAllPermissionsForDocument(idUser, idDocument) {
    const query = `
            SELECT 
                COALESCE(p_doc.preview, p_folder.preview, FALSE) as preview, --cek nilai null di parameter
                COALESCE(p_doc.download, p_folder.download, FALSE) as download,
                COALESCE(p_doc.upload, p_folder.upload, FALSE) as upload,
                COALESCE(p_doc.edit_metadata, p_folder.edit_metadata, FALSE) as edit_metadata
            FROM document d
            -- Cek izin langsung di dokumen
            LEFT JOIN permission p_doc ON p_doc.id_document = d.id_document AND p_doc.id_user = $1
            -- Cek izin dari folder tempat dokumen ini berada
            LEFT JOIN permission p_folder ON p_folder.id_folder = d.id_folder AND p_folder.id_user = $1
            WHERE d.id_document = $2;   
        `;
    const { rows } = await pool.query(query, [idUser, idDocument]);

    // Jika dokumen tidak ditemukan, kembalikan false untuk semuanya
    return rows.length > 0
      ? rows[0]
      : {
          preview: false,
          download: false,
          upload: false,
          edit_metadata: false,
        };
  }

  /**
   * Mengambil daftar user yang memiliki akses eksplisit ke suatu resource
   */
  static async getAccessList(resourceId, resourceType) {
    const idColumn = resourceType === "FOLDER" ? "id_folder" : "id_document";

    // Kita menggunakan JOIN untuk mengambil nama dari tabel "user"
    const query = `
            SELECT 
                p.id_permission, 
                p.id_user, 
                u.username AS user_name, 
                p.preview, 
                p.download, 
                p.upload, 
                p.edit_metadata
            FROM permission p
            JOIN "user" u ON p.id_user = u.id_user
            WHERE p.${idColumn} = $1 AND p.resource_type = $2;
        `;
    const { rows } = await pool.query(query, [resourceId, resourceType]);
    return rows;
  }

  /**
   * Memberikan atau memperbarui akses seorang user
   */
  static async grantAccess(
    full_name,
    resourceId,
    resourceType,
    permissions,
    creatorName,
  ) {
    // 1. Cari ID User berdasarkan fullname
    const userQuery = `SELECT id_user FROM "user" WHERE full_name = $1 LIMIT 1;`;
    const userResult = await pool.query(userQuery, [full_name]);

    if (userResult.rows.length === 0) {
      throw new Error("Pengguna dengan id tersebut tidak ditemukan di sistem.");
    }

    const idUser = userResult.rows[0].id_user;
    const idColumn = resourceType === "FOLDER" ? "id_folder" : "id_document";

    // 2. Cek apakah user ini sudah punya baris permission di resource ini
    const checkQuery = `
            SELECT id_permission FROM permission 
            WHERE id_user = $1 AND ${idColumn} = $2 AND resource_type = $3 LIMIT 1;
        `;
    const checkResult = await pool.query(checkQuery, [
      idUser,
      resourceId,
      resourceType,
    ]);

    if (checkResult.rows.length > 0) {
      // JIKA SUDAH ADA: Lakukan UPDATE
      const updateQuery = `
                UPDATE permission 
                SET 
                    preview = COALESCE($1, preview),
                    download = COALESCE($2, download),
                    upload = COALESCE($3, upload),
                    edit_metadata = COALESCE($4, edit_metadata)
                WHERE id_permission = $5
            `;
      await pool.query(updateQuery, [
        permissions.preview,
        permissions.download,
        permissions.upload,
        permissions.edit_metadata,
        checkResult.rows[0].id_permission,
      ]);
    } else {
      // JIKA BELUM ADA: Lakukan INSERT
      // Perhatikan penambahan kolom created_at dengan fungsi NOW() untuk mencegah error constraint
      const insertQuery = `
                INSERT INTO permission (id_user, ${idColumn}, resource_type, preview, download, upload, edit_metadata, created_at, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
            `;
      await pool.query(insertQuery, [
        idUser,
        resourceId,
        resourceType,
        permissions.preview??false,
        permissions.download??false,
        permissions.upload??false,
        permissions.edit_metadata??false,
        creatorName,
      ]);
    }
  }

  /**
   * Mencabut (menghapus) akses secara permanen
   */
  static async revokeAccess(idPermission) {
    const query = `DELETE FROM permission WHERE id_permission = $1;`;
    await pool.query(query, [idPermission]);
  }
}

module.exports = PermissionModel;

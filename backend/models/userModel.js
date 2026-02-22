const db = require('../config/db');

const UserModel = {
    // Mencari user berdasarkan username (email)
    findByUsername: async (username) => {
        const query = `
            SELECT u.*, p.position_name, d.department_name
            FROM "user" u
            LEFT JOIN position p ON u.id_position = p.id_position
            LEFT JOIN department d ON u.id_department = d.id_department
            WHERE u.username = $1
        `;
        const result = await db.query(query, [username]);
        return result.rows[0];
    },

    // (Opsional) Untuk keperluan dashboard nanti jika butuh count user
    countAll: async () => {
        const result = await db.query('SELECT COUNT(*) FROM "user"');
        return parseInt(result.rows[0].count);
    },

    // 1. GET ALL (Dengan Pagination, Search, dan JOIN)
    getAll: async (search, limit, offset) => {
        let queryData = `
            SELECT u.id_user, u.full_name, u.username, u.is_admin, 
                   u.id_position, u.id_department,
                   p.position_name, d.department_name
            FROM "user" u
            LEFT JOIN position p ON u.id_position = p.id_position
            LEFT JOIN department d ON u.id_department = d.id_department
        `;
        let queryCount = 'SELECT COUNT(*) FROM "user" u';
        let params = [];

        if (search) {
            const whereClause = ' WHERE u.full_name ILIKE $1 OR u.username ILIKE $1';
            queryData += whereClause;
            queryCount += whereClause;
            params.push(`%${search}%`);
        }

        queryData += ` ORDER BY u.id_user DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        
        const data = await db.query(queryData, [...params, limit, offset]);
        const count = await db.query(queryCount, params.length ? [params[0]] : []);

        return {
            rows: data.rows,
            total: parseInt(count.rows[0].count)
        };
    },

    // 2. CREATE
    create: async (data, client) => {
        // Generate ID manual karena BIGINT (Simple Timestamp workaround)
        const id = Date.now(); 
        const query = `
            INSERT INTO "user" (id_user, full_name, username, password, is_admin, id_position, id_department)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        return await db.client.query(query, [
            id, data.fullName, data.username, data.password, 
            data.isAdmin || false, data.idPosition, data.idDepartment
        ]);
    },

    // 3. UPDATE
    update: async (id, data) => {
        // Cek apakah password diganti atau tidak
        if (data.password) {
            const query = `
                UPDATE "user" SET full_name=$1, username=$2, password=$3, is_admin=$4, id_position=$5, id_department=$6
                WHERE id_user=$7
            `;
            return await db.query(query, [
                data.fullName, data.username, data.password, 
                data.isAdmin, data.idPosition, data.idDepartment, id
            ]);
        } else {
            // Update tanpa password
            const query = `
                UPDATE "user" SET full_name=$1, username=$2, is_admin=$3, id_position=$4, id_department=$5
                WHERE id_user=$6
            `;
            return await db.query(query, [
                data.fullName, data.username, data.isAdmin, 
                data.idPosition, data.idDepartment, id
            ]);
        }
    },

    // 4. DELETE
    delete: async (id) => {
        return await db.query('DELETE FROM "user" WHERE id_user = $1', [id]);
    },

    // (Tetap pertahankan fungsi findByUsername untuk login)
    findByUsername: async (username) => {
        const query = `
            SELECT u.*, p.position_name, d.department_name
            FROM "user" u
            LEFT JOIN position p ON u.id_position = p.id_position
            LEFT JOIN department d ON u.id_department = d.id_department
            WHERE u.username = $1
        `;
        const result = await db.query(query, [username]);
        return result.rows[0];
    },

    findById: async (id) =>{
        const query = `
            SELECT u.*, p.position_name, d.department_name
            FROM "user" u
            LEFT JOIN position p ON u.id_position = p.id_position
            LEFT JOIN department d ON u.id_department = d.id_department
            WHERE u.id_user = $1
        `;
        const result = await db.query(query, [id]);
        return result.rows[0];
    }
};

module.exports = UserModel;
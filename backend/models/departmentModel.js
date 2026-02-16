const db = require('../config/db');

const DepartmentModel = {
    // Ambil semua data (dengan filter & pagination)
    getAll: async (search, limit, offset) => {
        let queryData = 'SELECT * FROM department';
        let queryCount = 'SELECT COUNT(*) FROM department';
        let params = [];

        if (search) {
            queryData += ' WHERE department_name ILIKE $1';
            queryCount += ' WHERE department_name ILIKE $1';
            params.push(`%${search}%`);
        }

        // Tambahkan Limit & Offset untuk data
        queryData += ` ORDER BY id_department ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        
        const data = await db.query(queryData, [...params, limit, offset]);
        const count = await db.query(queryCount, params.length ? [params[0]] : []);

        return {
            rows: data.rows,
            total: parseInt(count.rows[0].count)
        };
    },

    // Tambah Data
    create: async (name) => {
        return await db.query('INSERT INTO department (department_name) VALUES ($1) RETURNING *', [name]);
    },

    // Update Data
    update: async (id, name) => {
        return await db.query('UPDATE department SET department_name = $1 WHERE id_department = $2', [name, id]);
    },

    // Hapus Data
    delete: async (id) => {
        return await db.query('DELETE FROM department WHERE id_department = $1', [id]);
    }
};

module.exports = DepartmentModel;
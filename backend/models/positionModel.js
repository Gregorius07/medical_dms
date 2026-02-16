const db = require('../config/db');

const PositionModel = {
    // Ambil semua data (dengan filter & pagination)
    getAll: async (search, limit, offset) => {
        let queryData = 'SELECT * FROM position';
        let queryCount = 'SELECT COUNT(*) FROM position';
        let params = [];

        if (search) {
            queryData += ' WHERE position_name ILIKE $1';
            queryCount += ' WHERE position_name ILIKE $1';
            params.push(`%${search}%`);
        }

        // Tambahkan Limit & Offset untuk data
        queryData += ` ORDER BY id_position ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        
        const data = await db.query(queryData, [...params, limit, offset]);
        const count = await db.query(queryCount, params.length ? [params[0]] : []);

        return {
            rows: data.rows,
            total: parseInt(count.rows[0].count)
        };
    },

    // Tambah Data
    create: async (name) => {
        return await db.query('INSERT INTO position (position_name) VALUES ($1) RETURNING *', [name]);
    },

    // Update Data
    update: async (id, name) => {
        return await db.query('UPDATE position SET position_name = $1 WHERE id_position = $2', [name, id]);
    },

    // Hapus Data
    delete: async (id) => {
        return await db.query('DELETE FROM position WHERE id_position = $1', [id]);
    }
};

module.exports = PositionModel;
const DepartmentModel = require('../models/departmentModel');
const { getPagination } = require('../utils/pagination');

const DepartmentController = {
    // GET ALL
    findAll: async (req, res) => {
        const { page, size, search } = req.query;
        const { limit, offset } = getPagination(page, size);

        try {
            const { rows, total } = await DepartmentModel.getAll(search, limit, offset);
            const totalPages = Math.ceil(total / limit);

            res.json({
                success: true,
                data: rows,
                pagination: {
                    totalItems: total,
                    totalPages,
                    currentPage: Number(page) || 1,
                    pageSize: limit
                }
            });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    // CREATE
    create: async (req, res) => {
        try {
            if (!req.body.name) return res.status(400).json({ message: "Nama posisi harus diisi" });
            
            await DepartmentModel.create(req.body.name);
            res.status(201).json({ success: true, message: "Posisi berhasil ditambahkan" });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    // UPDATE
    update: async (req, res) => {
        try {
            await DepartmentModel.update(req.params.id, req.body.name);
            res.json({ success: true, message: "Posisi berhasil diupdate" });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    // DELETE
    delete: async (req, res) => {
        try {
            await DepartmentModel.delete(req.params.id);
            res.json({ success: true, message: "Posisi berhasil dihapus" });
        } catch (err) {
            res.status(500).json({ message: "Gagal menghapus data (sedang digunakan)" });
        }
    }
};

module.exports = DepartmentController;
const UserModel = require('../models/userModel');
const { getPagination } = require('../utils/pagination');

const UserController = {
    findAll: async (req, res) => {
        const { page, size, search } = req.query;
        const { limit, offset } = getPagination(page, size);

        try {
            const { rows, total } = await UserModel.getAll(search, limit, offset);
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

    create: async (req, res) => {
        try {
            await UserModel.create(req.body);
            res.status(201).json({ success: true, message: "User berhasil ditambahkan" });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    update: async (req, res) => {
        try {
            await UserModel.update(req.params.id, req.body);
            res.json({ success: true, message: "User berhasil diupdate" });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    delete: async (req, res) => {
        try {
            await UserModel.delete(req.params.id);
            res.json({ success: true, message: "User berhasil dihapus" });
        } catch (err) {
            res.status(500).json({ message: "Gagal menghapus user" });
        }
    }
};

module.exports = UserController;
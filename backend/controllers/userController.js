const UserModel = require('../models/userModel');
const { getPagination } = require('../utils/pagination');
const PermissionModel = require('../models/permissionModel');
const FolderModel = require('../models/folderModel');
const pool = require('../config/db');

const UserController = {

    searchUser: async(req,res) =>{
        try {
            const keyword = req.query.q;
            console.log("keyword",keyword);
            
            const result = await UserModel.findByFullOrUsername(keyword);
            res.json(result);    
        } catch (error) {
            res.json({message: "Gagal mencari user: ", error})
        }
    },

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
        const client = await pool.connect();
        try {
            console.log('Memulai create user!');
            
            await client.query('BEGIN');

            const newUser = await UserModel.create(req.body,client);
            console.log("Variabel newUser :", newUser);
            const folderName = `Draft - ${newUser.id_user}`;
            
            // console.log(folderName);
            const newFolder = await FolderModel.createFolder(folderName, null,newUser.id_user, req.name, client);
            console.log("New Folder", newFolder);
            
            // await PermissionModel.createFolderPermission(newUser.id_user, newFolder.id_folder, 'system', client);

            await client.query('COMMIT');

            res.status(201).json({ success: true, message: "User berhasil ditambahkan" });
        } catch (err) {
            await client.query('ROLLBACK');
            res.status(500).json({ message: 'Gagal menambahkan User' , err});
        } finally{
            client.release();
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
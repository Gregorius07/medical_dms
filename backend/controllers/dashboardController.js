const DashboardModel = require('../models/dashboardModel');

const DashboardController = {
    getStats: async (req, res) => {
        try {
            const stats = await DashboardModel.getStats();
            res.json(stats);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Gagal mengambil data dashboard" });
        }
    }
};

module.exports = DashboardController;
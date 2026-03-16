// controllers/approvalController.js
const ApprovalModel = require("../models/approvalModel");
const AuditModel = require("../models/auditModel");
const PermissionModel = require("../models/permissionModel");

const requestApproval = async (req, res) => {
  try {
    const { approverFullName } = req.body;
    const docId = req.params.id;

    await ApprovalModel.createRequest(docId, req.userId, approverFullName);
    AuditModel.log(
      "UPDATE",
      "DOCUMENT",
      req.userId,
      null,
      docId,
      `Mengajukan approval ke: ${approverFullName}`,
    );
    await PermissionModel.grantAccess(
      approverFullName,
      docId,
      "DOCUMENT",
      { preview: true },
      req.name,
    );
    res.status(200).json({ message: "Permintaan approval terkirim." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const respondApproval = async (req, res) => {
  try {
    const { status, notes } = req.body; // 'APPROVED' atau 'REJECTED'
    const docId = req.params.id;

    await ApprovalModel.respondRequest(docId, req.userId, status, notes);
    AuditModel.log(
      "UPDATE",
      "DOCUMENT",
      req.userId,
      null,
      docId,
      `Merespons approval: ${status}`,
    );

    res
      .status(200)
      .json({ message: `Dokumen berhasil di-${status.toLowerCase()}` });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const getInbox = async (req, res) => {
  try {
    const userId = req.userId;
    const data = await ApprovalModel.getInbox(userId);
    res.status(200).json(data);
  } catch (error) {
    console.error("Error getInbox:", error);
    res.status(500).json({ message: "Gagal mengambil data Inbox Approval." });
  }
};

const getOutbox = async (req, res) => {
  try {
    const userId = req.userId;
    const data = await ApprovalModel.getOutbox(userId);
    res.status(200).json(data);
  } catch (error) {
    console.error("Error getOutbox:", error);
    res.status(500).json({ message: "Gagal mengambil data Outbox Approval." });
  }
};

const getHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const data = await ApprovalModel.getHistory(userId);
    res.status(200).json(data);
  } catch (error) {
    console.error("Error getHistory:", error);
    res.status(500).json({ message: "Gagal mengambil data Riwayat Approval." });
  }
};

module.exports = {
  requestApproval,
  respondApproval,
  getInbox,
  getOutbox,
  getHistory,
};

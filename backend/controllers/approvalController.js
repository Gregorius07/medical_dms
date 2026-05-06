// controllers/approvalController.js
const ApprovalModel = require("../models/approvalModel");
const AuditModel = require("../models/auditModel");
const PermissionModel = require("../models/permissionModel");

const requestApproval = async (req, res) => {
  try {
    const { approverFullName, isAutomatic, idTargetFolder } = req.body;
    const docId = req.params.id;

    await ApprovalModel.createRequest(docId, req.userId, approverFullName, isAutomatic || false, idTargetFolder || null);
    
    const logMessage = isAutomatic && idTargetFolder
      ? `Mengajukan approval ke: ${approverFullName} (Otomatis ke folder target)`
      : `Mengajukan approval ke: ${approverFullName}`;
    
    AuditModel.log(
      "REQUEST_APPROVAL",
      "DOCUMENT",
      req.userId,
      null,
      docId,
      logMessage,
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

    // Get approval info sebelum update untuk logging
    const approvalInfoBefore = await ApprovalModel.getActiveApprovalInfo(docId);

    await ApprovalModel.respondRequest(docId, req.userId, status, notes);
    
    if (status === "APPROVED") {
      // Jika approval otomatis (ada target folder), tambahkan info folder ke log
      let logMessage = `Menyetujui pengajuan approval`;
      if (approvalInfoBefore?.id_target_folder && approvalInfoBefore?.target_folder_name) {
        logMessage += ` - Dokumen otomatis berpindah ke folder: ${approvalInfoBefore.target_folder_name}`;
      }
      
      AuditModel.log(
        "APPROVE",
        "DOCUMENT",
        req.userId,
        null,
        docId,
        logMessage,
      );
    }
    else{
      AuditModel.log(
        "REJECT",
        "DOCUMENT",
        req.userId,
        null,
        docId,
        `Menolak pengajuan approval`,
      );
    }

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

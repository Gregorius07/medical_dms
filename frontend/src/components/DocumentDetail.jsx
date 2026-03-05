import { createSignal, onMount, Show } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import api from "../api";
import { currentUser } from "../store/authStore";
import ManageAccessModal from "./ManageAccessModal";

function DocumentDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const documentId = params.id; // Mendapatkan ID dari URL: /document/:id

  const [doc, setDoc] = createSignal(null);
  const [loading, setLoading] = createSignal(true);

  const [isUploadOpen, setIsUploadOpen] = createSignal(false);
  const [uploadFile, setUploadFile] = createSignal(null);
  const [uploadLoading, setUploadLoading] = createSignal(false);
  const [logs, setLogs] = createSignal([]);
  const [isAccessModalOpen, setIsAccessModalOpen] = createSignal(false);

  //signal approval
  const [activeApproval, setActiveApproval] = createSignal(null);
  const [approverFullName, setApproverFullName] = createSignal("");
  const [approvalNotes, setApprovalNotes] = createSignal("");
  const [isProcessing, setIsProcessing] = createSignal(false);

  // Nanti kita akan isi ini dari API berdasarkan tabel 'permission'
  const [permissions, setPermissions] = createSignal({
    preview: false,
    download: false,
    upload: false,
    edit_metadata: false,
  });

  const fetchDocumentDetail = async () => {
    try {
      console.log('variabel documentId:',documentId);
      
      setLoading(true);
      // Endpoint ini harusnya mengembalikan detail dokumen + permission user tersebut
      const res = await api.get(`/documents/${documentId}`);
      setDoc(res.data.document);
      setPermissions(res.data.permissions);
      setLogs(res.data.logs || []);
      setActiveApproval(res.data.activeApproval); // Tangkap data approval
    } catch (err) {
      console.error("Gagal mengambil detail dokumen", err);
      // alert("Dokumen tidak ditemukan atau Anda tidak memiliki akses");
      // navigate(-1); // Kembali ke halaman sebelumnya
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    fetchDocumentDetail();
  });

  // --- HANDLERS ---
  const handleDownload = async () => {
    try {
      // Kita gunakan responseType 'blob' karena kita menerima file fisik, bukan teks JSON
      const res = await api.get(`/documents/${documentId}/download`, {
        responseType: "blob",
      });

      // Trik Javascript untuk memaksa browser mengunduh file
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      // Gunakan nama asli file dari state dokumen
      link.setAttribute("download", doc()?.file_name || "document.pdf");
      document.body.appendChild(link);
      link.click();

      // Bersihkan memori browser setelah klik
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Gagal mengunduh dokumen. Pastikan Anda memiliki izin.");
    }
  };

  const handleEditMetadata = () => {
    alert("Fitur Edit Metadata akan memunculkan form di sini.");
  };

  const handleUploadRevision = () => {
    setIsUploadOpen(true); // Membuka Modal
  };

  const submitRevision = async (e) => {
    e.preventDefault();
    if (!uploadFile()) return alert("Pilih file PDF baru terlebih dahulu!");

    setUploadLoading(true);
    const formData = new FormData();
    formData.append("file", uploadFile());
    formData.append("uploaderName", currentUser().name);

    try {
      await api.post(`/documents/${documentId}/revisions`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Revisi berhasil diunggah!");

      // Tutup modal & Bersihkan form
      setIsUploadOpen(false);
      setUploadFile(null);

      // PENTING: Refresh data di halaman agar Iframe PDF dan metadata langsung berubah ke versi terbaru!
      fetchDocumentDetail();
    } catch (err) {
      alert(
        "Gagal mengunggah revisi: " +
          (err.response?.data?.message || err.message),
      );
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div class="min-h-screen bg-gray-50 p-4 md:p-6 flex flex-col">
      {/* HEADER: Tombol Back & Judul */}
      <div class="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate(-1)}
          class="p-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-full transition shadow-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <div>
          <h1 class="text-xl font-bold text-gray-800">
            {loading() ? "Memuat..." : doc()?.title || doc()?.file_name}
          </h1>
          <p class="text-xs text-gray-500">Document ID: {documentId}</p>
        </div>
      </div>

      <Show
        when={!loading() && doc()}
        fallback={
          <div class="flex-1 flex justify-center items-center text-gray-500">
            Memuat Dokumen...
          </div>
        }
      >
        <div class="flex flex-col lg:flex-row gap-6 flex-1 h-[calc(100vh-120px)]">
          {/* ======================================= */}
          {/* SISI KIRI: PREVIEW AREA (70% Lebar) */}
          {/* ======================================= */}
          <div class="flex-[3] bg-gray-800 rounded-xl shadow-inner overflow-hidden border border-gray-300 flex flex-col">
            <div class="bg-gray-900 px-4 py-2 flex justify-between items-center text-gray-300 text-sm">
              <span>Preview Panel</span>
              <span class="uppercase font-mono text-xs">
                {doc()?.file_name?.split(".").pop()}
              </span>
            </div>

            <div class="flex-1 w-full h-full relative">
              <Show
                when={permissions().preview}
                fallback={
                  <div class="absolute inset-0 flex items-center justify-center text-gray-400">
                    Anda tidak memiliki izin preview untuk dokumen ini.
                  </div>
                }
              >
                {/* Jika file adalah PDF, kita bisa pakai iframe. 
                  Pastikan backend menyediakan endpoint untuk menyajikan file ini.
                */}
                <iframe
                  src={`http://localhost:5000/${doc()?.file_path}`}
                  class="w-full h-full border-0"
                  title="Document Preview"
                ></iframe>
              </Show>
            </div>
          </div>

          {/* ======================================= */}
          {/* SISI KANAN: METADATA & ACTIONS (30% Lebar) */}
          {/* ======================================= */}
          <div class="flex-[1] bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col gap-6 overflow-y-auto">
            {/* ACTION BUTTONS (Dirender berdasarkan Permission) */}
            <div class="flex flex-col gap-3 pb-6 border-b border-gray-100">
              <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Actions
              </h3>
              {/* TOMBOL MANAGE ACCESS (Contoh: Hanya muncul untuk Admin) */}
              <Show when={currentUser()?.role === "admin"}>
                <button
                  onClick={() => setIsAccessModalOpen(true)}
                  class="w-full py-2.5 bg-gray-800 text-white hover:bg-gray-900 font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition mb-2 shadow-md"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Manage Access
                </button>
              </Show>
              <Show when={permissions().download}>
                <button
                  onClick={handleDownload}
                  class="w-full py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download File
                </button>
              </Show>

              <Show when={permissions().edit_metadata}>
                <button
                  onClick={handleEditMetadata}
                  class="w-full py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit Metadata
                </button>
              </Show>

              <Show when={permissions().upload}>
                <button
                  onClick={handleUploadRevision}
                  class="w-full py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Upload New Version
                </button>
              </Show>
            </div>

            {/* ======================================= */}
            {/* PANEL WORKFLOW APPROVAL */}
            {/* ======================================= */}
            <div class=" rounded-xl  flex flex-col gap-3">
              <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Approval Workflow</h3>

              {/* KONDISI 1: DOKUMEN MASIH DRAFT/REJECTED -> BISA MENGAJUKAN APPROVAL */}
              <Show when={(doc()?.approval_status === 'DRAFT' || doc()?.approval_status === 'REJECTED') && permissions().upload}>
                <div class="space-y-2">
                  <p class="text-xs text-gray-600">Ajukan dokumen ini untuk direview oleh atasan/rekan.</p>
                  <input 
                    type="text" 
                    placeholder="Approver name..." 
                    value={approverFullName()}
                    onInput={(e) => setApproverFullName(e.target.value)}
                    class="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <button 
                    onClick={async () => {
                      if(!approverFullName()) return alert('Isi email approver!');
                      setIsProcessing(true);
                      try {
                        await api.post(`/documents/${documentId}/request-approval`, { approverFullName: approverFullName() });
                        fetchDocumentDetail(); // Refresh halaman
                      } catch(err) { alert(err.response?.data?.message); }
                      setIsProcessing(false);
                    }}
                    disabled={isProcessing()}
                    class="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition"
                  >
                    Ajukan Approval
                  </button>
                </div>
              </Show>

              {/* KONDISI 2: DOKUMEN PENDING -> MENUNGGU APPROVAL (Untuk Peminta) */}
              <Show when={doc()?.approval_status === 'UNDER REVIEW' && currentUser()?.id !== activeApproval()?.id_approver}>
                <div class="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-start gap-3">
                  <span class="text-yellow-600 mt-0.5">⏳</span>
                  <div>
                    <p class="text-sm font-bold text-yellow-800">Menunggu Review</p>
                    <p class="text-xs text-yellow-700 mt-1">Berada di meja: <b>{activeApproval()?.approver_name}</b></p>
                  </div>
                </div>
              </Show>

              {/* KONDISI 3: DOKUMEN PENDING -> PANEL AKSI UNTUK SANG APPROVER */}
              <Show when={doc()?.approval_status === 'UNDER REVIEW' && currentUser()?.id === activeApproval()?.id_approver}>
                <div class="space-y-3">
                  <div class="bg-blue-50 border border-blue-200 p-2 rounded text-xs text-blue-800">
                    Seseorang meminta Anda untuk mereview dokumen ini.
                  </div>
                  <textarea 
                    placeholder="Catatan review (Opsional)..." 
                    value={approvalNotes()}
                    onInput={(e) => setApprovalNotes(e.target.value)}
                    class="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 h-20 resize-none"
                  ></textarea>
                  
                  <div class="flex gap-2">
                    <button 
                      onClick={async () => {
                        setIsProcessing(true);
                        try {
                          await api.post(`/documents/${documentId}/respond-approval`, { status: 'REJECTED', notes: approvalNotes() });
                          fetchDocumentDetail();
                        } catch(err) { alert('Gagal merespons'); }
                        setIsProcessing(false);
                      }}
                      class="flex-1 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded text-sm transition"
                    >
                      Tolak
                    </button>
                    
                    <button 
                      onClick={async () => {
                        setIsProcessing(true);
                        try {
                          await api.post(`/documents/${documentId}/respond-approval`, { status: 'APPROVED', notes: approvalNotes() });
                          fetchDocumentDetail();
                        } catch(err) { alert('Gagal merespons'); }
                        setIsProcessing(false);
                      }}
                      class="flex-1 py-2 bg-green-600 text-white hover:bg-green-700 font-medium rounded text-sm transition"
                    >
                      Setujui
                    </button>
                  </div>
                </div>
              </Show>
            </div>

            {/* --- PEMBATAS --- */}
            <hr class="border-gray-100 my-2" />


            {/* METADATA INFO */}
            <div class="flex flex-col gap-4">
              <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Document Info
              </h3>

              <div>
                <p class="text-xs text-gray-500 mb-1">Status Approval</p>
                <span
                  class={`px-2.5 py-1 rounded-md text-xs font-bold ${
                    doc()?.approval_status === "APPROVED"
                      ? "bg-green-100 text-green-700"
                      : doc()?.approval_status === "DRAFT"
                        ? "bg-gray-100 text-gray-600"
                        : doc()?.approval_status === "UNDER REVIEW"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {doc()?.approval_status || "UNKNOWN"}
                </span>
              </div>

              <div>
                <p class="text-xs text-gray-500 mb-1">Uploader</p>
                <p class="text-sm font-medium text-gray-800">
                  {doc()?.created_by}
                </p>
              </div>

              <div>
                <p class="text-xs text-gray-500 mb-1">Tanggal Upload</p>
                <p class="text-sm font-medium text-gray-800">
                  {new Date(doc()?.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div>
                <p class="text-xs text-gray-500 mb-1">Ukuran File</p>
                <p class="text-sm font-medium text-gray-800">
                  {(doc()?.file_size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>

            {/* --- PEMBATAS --- */}
            <hr class="border-gray-100 my-2" />

            

            {/* RIWAYAT AKTIVITAS (AUDIT LOG TIMELINE) */}
            <div class="flex flex-col flex-1 min-h-[250px]">
              <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>Document History</span>
                <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">
                  {logs().length}
                </span>
              </h3>

              <div class="relative border-l-2 border-gray-100 ml-3 pl-4 space-y-5 overflow-y-auto pr-2 pb-4 max-h-[280px]">
                <Show
                  when={logs().length > 0}
                  fallback={
                    <div class="text-xs text-gray-400 italic">
                      Belum ada riwayat aktivitas.
                    </div>
                  }
                >
                  <For each={logs()}>
                    {(log) => (
                      <div class="relative">
                        {/* Bulatan Timeline berdasarkan Action */}
                        <div
                          class={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                            log.action === "UPLOAD"
                              ? "bg-blue-500"
                              : log.action === "DOWNLOAD"
                                ? "bg-green-500"
                                : "bg-purple-400"
                          }`}
                        ></div>

                        <div class="flex flex-col">
                          {/* Nama & Waktu */}
                          <div class="flex items-center justify-between gap-2">
                            <span class="text-sm font-semibold text-gray-800">
                              {log.actor_name || "Sistem"}
                            </span>
                            <span class="text-[10px] text-gray-400 font-medium">
                              {new Date(log.timestamp).toLocaleDateString(
                                "id-ID",
                                { day: "numeric", month: "short" },
                              )}{" "}
                              •{" "}
                              {new Date(log.timestamp).toLocaleTimeString(
                                "id-ID",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </div>

                          {/* Aksi & Detail */}
                          <div class="flex items-center gap-2 mt-0.5">
                            <span
                              class={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                log.action === "UPLOAD"
                                  ? "bg-blue-50 text-blue-600"
                                  : log.action === "DOWNLOAD"
                                    ? "bg-green-50 text-green-600"
                                    : "bg-purple-50 text-purple-600"
                              }`}
                            >
                              {log.action}
                            </span>
                            <span
                              class="text-xs text-gray-500 truncate"
                              title={log.details}
                            >
                              {log.action === "PREVIEW"
                                ? "Melihat dokumen"
                                : log.details}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                </Show>
              </div>
            </div>
            
          </div>

          
        </div>
      </Show>

      {/* MODAL UPLOAD REVISION */}
      <Show when={isUploadOpen()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-xl shadow-lg w-[400px] p-6">
            <h3 class="text-lg font-bold mb-4 text-gray-800">
              Upload New Version
            </h3>

            <form onSubmit={submitRevision} class="space-y-4">
              <div class="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:bg-blue-50 transition cursor-pointer relative bg-blue-50/50">
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required
                />
                <div class="text-blue-600 font-medium mb-1">
                  Click to select new PDF file
                </div>
                <div class="text-xs text-gray-400 mb-2">Max 10MB</div>
                <Show when={uploadFile()}>
                  <div class="text-sm text-green-700 font-bold bg-green-100 py-1 px-2 rounded inline-block truncate max-w-full">
                    {uploadFile()?.name}
                  </div>
                </Show>
              </div>

              <div class="flex justify-end gap-2 pt-4 border-t mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadOpen(false);
                    setUploadFile(null);
                  }}
                  class="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading()}
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                  {uploadLoading() ? "Uploading..." : "Upload Revision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* MODAL MANAGE ACCESS */}
     <Show when={isAccessModalOpen()}>
       <ManageAccessModal 
         resourceId={documentId} 
         resourceType="DOCUMENT" 
         onClose={() => setIsAccessModalOpen(false)} 
       />
     </Show>
    </div>
  );
}

export default DocumentDetail;

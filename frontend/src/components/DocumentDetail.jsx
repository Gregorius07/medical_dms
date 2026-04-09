import { createSignal, onMount, Show, createEffect } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import api from "../api";
import { currentUser } from "../store/authStore";
import ManageAccessModal from "./ManageAccessModal";
import Swal from "sweetalert2";
// Di atas komponen
import * as pdfjsLib from "pdfjs-dist"; 
// Trik Vite: Tambahkan ?url di akhir agar Vite mengambilkan URL statis dari file worker
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url"; 

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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

  // State untuk filter riwayat (Audit Log)
  const [logFilter, setLogFilter] = createSignal("ALL");

  // STATE UNTUK VERSION HISTORY
  const [versions, setVersions] = createSignal([]);

  // --- STATE UNTUK AUTOCOMPLETE USER ---
  const [userSuggestions, setUserSuggestions] = createSignal([]);
  const [showSuggestions, setShowSuggestions] = createSignal(false);
  const [isSearchingUsers, setIsSearchingUsers] = createSignal(false);
  let userSearchTimeout;

  // --- STATE UNTUK CUSTOM PDF VIEWER ---
  const [pdfRef, setPdfRef] = createSignal(null);
  const [pageNum, setPageNum] = createSignal(1);
  const [totalPages, setTotalPages] = createSignal(0);
  const [scale, setScale] = createSignal(1.2); // Default zoom
  let canvasRef; // Referensi untuk elemen <canvas>

  // STATE UNTUK EDIT METADATA
  const [isEditMetadataOpen, setIsEditMetadataOpen] = createSignal(false);
  const [editMetadataForm, setEditMetadataForm] = createSignal({});
  const [editMetadataLoading, setEditMetadataLoading] = createSignal(false);

  // Fungsi untuk menggambar halaman PDF ke Canvas
  const renderPage = (num, pdfDocument) => {
    if (!pdfDocument || !canvasRef) return;

    pdfDocument.getPage(num).then((page) => {
      const viewport = page.getViewport({ scale: scale() });
      const canvas = canvasRef;
      const ctx = canvas.getContext("2d");

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };
      page.render(renderContext);
    });
  };

  // Efek reaktif: Load PDF dari backend ketika doc() dan permission preview sudah tersedia
  createEffect(() => {
    const currentDoc = doc();
    if (currentDoc?.file_path && permissions().preview) {
      // PENTING: File harus bisa diakses secara publik atau via auth header yang diizinkan CORS
      const url = `http://localhost:5000/${currentDoc.file_path}`;

      // Load PDF kustom kustom
      pdfjsLib
        .getDocument(url)
        .promise.then((pdf) => {
          setPdfRef(pdf);
          setTotalPages(pdf.numPages);
          setPageNum(1); // Reset ke halaman 1
          renderPage(1, pdf);
        })
        .catch((err) => {
          console.error("Gagal memuat PDF untuk preview:", err);
        });
    }
  });

  // Handler Navigasi PDF
  const prevPage = () => {
    if (pageNum() <= 1) return;
    setPageNum(pageNum() - 1);
    renderPage(pageNum() - 1, pdfRef());
  };

  const nextPage = () => {
    if (pageNum() >= totalPages()) return;
    setPageNum(pageNum() + 1);
    renderPage(pageNum() + 1, pdfRef());
  };

  const zoomIn = () => {
    setScale((s) => s + 0.2);
    renderPage(pageNum(), pdfRef());
  };

  const zoomOut = () => {
    setScale((s) => Math.max(0.6, s - 0.2));
    renderPage(pageNum(), pdfRef());
  };

  // Fungsi reaktif untuk memfilter logs
  const filteredLogs = () => {
    if (logFilter() === "ALL") return logs();
    return logs().filter((log) => log.action === logFilter());
  };

  // Nanti kita akan isi ini dari API berdasarkan tabel 'permission'
  const [permissions, setPermissions] = createSignal({
    preview: false,
    download: false,
    upload: false,
    edit_metadata: false,
  });

  const fetchDocumentDetail = async () => {
    try {
      console.log("variabel documentId:", documentId);

      setLoading(true);
      // Endpoint ini harusnya mengembalikan detail dokumen + permission user tersebut
      const res = await api.get(`/documents/${documentId}`);
      setDoc(res.data.document);
      setPermissions(res.data.permissions);
      setLogs(res.data.logs || []);
      setActiveApproval(res.data.activeApproval); // Tangkap data approval
      fetchVersions();
    } catch (err) {
      console.error("Gagal mengambil detail dokumen", err);
      // alert("Dokumen tidak ditemukan atau Anda tidak memiliki akses");
      // navigate(-1); // Kembali ke halaman sebelumnya
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    try {
      const res = await api.get(`/documents/${documentId}/versions`);
      setVersions(res.data.data);
    } catch (err) {
      console.error("Gagal mengambil riwayat versi", err);
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
      Swal.fire({
        icon: "error",
        title: "Akses Ditolak",
        text: "Gagal mengunduh dokumen. Pastikan Anda memiliki izin.",
      });
    }
  };

  // Membuka modal dan mengisi form dengan metadata saat ini
  const handleEditMetadata = () => {
    // Ambil custom_metadata dari dokumen saat ini. Jika null, gunakan object kosong {}
    const currentMetadata = doc()?.custom_metadata || {};
    setEditMetadataForm({ ...currentMetadata });
    setIsEditMetadataOpen(true);
  };

  // Handler untuk menyimpan perubahan metadata ke backend
  const submitEditMetadata = async (e) => {
    e.preventDefault();
    setEditMetadataLoading(true);

    try {
      // Endpoint untuk update metadata (Pastikan backend Anda merespons endpoint ini)
      await api.put(`/documents/${documentId}/metadata`, {
        custom_metadata: editMetadataForm()
      });
      
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Metadata dokumen berhasil diperbarui.",
        timer: 1500,
        showConfirmButton: false,
      });

      setIsEditMetadataOpen(false);
      fetchDocumentDetail(); // Refresh data di layar
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal Menyimpan",
        text: err.response?.data?.message || "Terjadi kesalahan saat menyimpan metadata.",
      });
    } finally {
      setEditMetadataLoading(false);
    }
  };

  const handleUploadRevision = () => {
    setIsUploadOpen(true); // Membuka Modal
  };

  const submitRevision = async (e) => {
    e.preventDefault();
    if (!uploadFile()) {
      return Swal.fire({
        icon: "warning",
        title: "Peringatan",
        text: "Pilih file PDF baru terlebih dahulu!",
      });
    }

    setUploadLoading(true);
    const formData = new FormData();
    formData.append("file", uploadFile());
    formData.append("uploaderName", currentUser().name);

    try {
      await api.post(`/documents/${documentId}/revisions`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Revisi berhasil diunggah!",
        timer: 2000,
        showConfirmButton: false,
      });

      // Tutup modal & Bersihkan form
      setIsUploadOpen(false);
      setUploadFile(null);

      // PENTING: Refresh data di halaman agar Iframe PDF dan metadata langsung berubah ke versi terbaru!
      fetchDocumentDetail();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal Mengunggah",
        text: err.response?.data?.message || err.message,
      });
    } finally {
      setUploadLoading(false);
    }
  };

  // Handler saat user mengetik nama approver
  const handleApproverInput = (e) => {
    const value = e.target.value;
    setApproverFullName(value);
    setShowSuggestions(true);

    // Hapus timer sebelumnya
    clearTimeout(userSearchTimeout);

    if (!value.trim()) {
      setUserSuggestions([]);
      setIsSearchingUsers(false);
      return;
    }

    setIsSearchingUsers(true);

    // Debounce: Tunggu 300ms setelah berhenti mengetik
    userSearchTimeout = setTimeout(async () => {
      try {
        // ASUMSI: Anda perlu membuat endpoint GET /api/users/search?q=... di backend
        const res = await api.get(`/users/search?q=${value}`);
        // Asumsi backend mengembalikan array of user objects: [{ name: '...', email: '...', ... }]
        setUserSuggestions(res.data.data || res.data || []);
      } catch (err) {
        console.error("Gagal mencari user", err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 400);
  };

  // --- HANDLER ROLLBACK ---
  const handleRollback = async (versionId, versionNumber) => {
    const result = await Swal.fire({
      title: `Rollback ke Versi ${versionNumber}?`,
      text: "Dokumen akan dipulihkan ke versi ini, menjadikannya versi aktif bagi semua pengguna.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Rollback!",
      cancelButtonText: "Batal"
    });

    if (!result.isConfirmed) return;

    try {
      await api.post(`/documents/${documentId}/rollback`, { targetVersionId: versionId });
      Swal.fire({ icon: "success", title: "Berhasil!", text: `Dokumen dipulihkan ke Versi ${versionNumber}.`, timer: 2000, showConfirmButton: false });
      fetchDocumentDetail(); // Refresh semua data (termasuk PDF Viewer)
    } catch (error) {
      Swal.fire({ icon: "error", title: "Gagal", text: error.response?.data?.message || "Gagal melakukan rollback" });
    }
  };

  // Handler saat user memilih nama dari dropdown
  const selectApprover = (user) => {
    setApproverFullName(user.full_name); // Isi input dengan nama lengkap
    // Opsional: Jika backend Anda butuh email atau ID, Anda bisa menyimpannya di state terpisah di sini
    setShowSuggestions(false);
  };

  return (
    <div class="min-h-screen bg-gray-50 p-4 md:p-6 flex flex-col">
      {/* HEADER: Tombol Back, Judul & Status */}
      <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        
        {/* Kiri: Tombol Back & Judul */}
        <div class="flex items-start gap-4 flex-1 min-w-0">
          <button
            onClick={() => navigate(-1)}
            class="p-2.5 mt-0.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-full transition shadow-sm shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          
          {/* Tambahkan min-w-0 dan break-words agar teks panjang tidak merusak layout */}
          <div class="min-w-0">
            <h1 class="text-xl md:text-2xl font-bold text-gray-900 tracking-tight break-words">
              {loading() ? "Memuat..." : doc()?.title || doc()?.file_name}
            </h1>
            <p class="text-xs text-gray-500 font-mono mt-1">ID: {documentId}</p>
          </div>
        </div>
        
        {/* Kanan: Badge Status (Rata Kanan) */}
        <div class="shrink-0 md:ml-4 ml-14">
          <Show when={!loading() && doc()}>
            <span
              class={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${
                doc()?.approval_status === "APPROVED"
                  ? "bg-green-50 border-green-200 text-green-700"
                  : doc()?.approval_status === "DRAFT"
                  ? "bg-gray-100 border-gray-200 text-gray-600"
                  : doc()?.approval_status === "UNDER REVIEW"
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {/* Dot Indicator */}
              <span class={`w-1.5 h-1.5 rounded-full mr-2 ${doc()?.approval_status === "APPROVED" ? "bg-green-500" : doc()?.approval_status === "DRAFT" ? "bg-gray-400" : doc()?.approval_status === "UNDER REVIEW" ? "bg-amber-500" : "bg-red-500"}`}></span>
              {doc()?.approval_status || "UNKNOWN"}
            </span>
          </Show>
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
          {/* SISI KIRI: PREVIEW AREA (70% Lebar) */}
          <div class="flex-[3] bg-gray-800 rounded-xl shadow-inner overflow-hidden border border-gray-300 flex flex-col">
            <div class="bg-gray-900 px-4 py-2 flex justify-between items-center text-gray-300 text-sm">
              <span>Preview Panel</span>
              <span class="uppercase font-mono text-xs">
                {doc()?.file_name?.split(".").pop()}
              </span>
            </div>

            <div class="flex-1 w-full h-full relative flex flex-col items-center overflow-auto p-4">
              <Show
                when={permissions().preview}
                fallback={
                  <div class="absolute inset-0 flex items-center justify-center text-gray-400">
                    Anda tidak memiliki izin preview untuk dokumen ini.
                  </div>
                }
              >
                {/* TOOLBAR NAVIGASI PDF ELEGAN */}
                <div class="flex items-center gap-2 mb-6 bg-gray-900/80 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-700 shadow-2xl sticky top-4 z-10 transition-all">
                  
                  {/* Zoom Controls */}
                  <div class="flex items-center gap-1">
                    <button onClick={zoomOut} class="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition" title="Zoom Out">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                        <path fill-rule="evenodd" d="M5 8a1 1 0 011-1h4a1 1 0 110 2H6a1 1 0 01-1-1z" clip-rule="evenodd" />
                      </svg>
                    </button>
                    <span class="text-xs font-medium text-gray-300 w-10 text-center select-none">
                      {Math.round(scale() * 100)}%
                    </span>
                    <button onClick={zoomIn} class="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition" title="Zoom In">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                        <path fill-rule="evenodd" d="M8 5a1 1 0 011 1v1h1a1 1 0 110 2H9v1a1 1 0 11-2 0V9H6a1 1 0 110-2h1V6a1 1 0 011-1z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  {/* Garis Pemisah */}
                  <div class="w-px h-5 bg-gray-700 mx-1"></div>

                  {/* Page Navigation */}
                  <div class="flex items-center gap-1">
                    <button 
                      onClick={prevPage} 
                      disabled={pageNum() <= 1} 
                      class="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition" 
                      title="Previous Page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>
                    
                    <div class="flex items-center px-2 text-sm text-gray-400 select-none">
                      <span class="font-bold text-white min-w-[1rem] text-center">{pageNum()}</span>
                      <span class="mx-1.5 opacity-50">/</span>
                      <span>{totalPages()}</span>
                    </div>

                    <button 
                      onClick={nextPage} 
                      disabled={pageNum() >= totalPages()} 
                      class="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition" 
                      title="Next Page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* AREA KANVAS RENDER PDF */}
                <div class="border border-gray-600 shadow-2xl mb-10 bg-white">
                  <canvas ref={canvasRef}></canvas>
                </div>
              </Show>
            </div>
          </div>
          {/* ======================================= */}
          {/* SISI KANAN: METADATA & ACTIONS (30% Lebar) */}
          {/* ======================================= */}
          <div class="flex-[1] bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col gap-6 overflow-y-auto">
            {/* ACTION BUTTONS */}
            <div class="flex flex-col gap-3 pb-6 border-b border-gray-100">
              <h3 class="text-[11px] font-bold text-black-400 uppercase tracking-widest mb-1">
                Aksi Dokumen
              </h3>
              
              <Show when={currentUser()?.role === "admin" || currentUser()?.name === doc().created_by}>
                <button
                  onClick={() => setIsAccessModalOpen(true)}
                  class="w-full py-2.5 bg-white border border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Kelola Akses
                </button>
              </Show>

              <Show when={permissions().download}>
                <button
                  onClick={handleDownload}
                  class="w-full py-2.5 bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Unduh Dokumen
                </button>
              </Show>

                <Show when={permissions().edit_metadata}>
                  <button
                    onClick={handleEditMetadata}
                    class="w-full py-2.5 bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Metadata
                  </button>
                </Show>

                <Show when={permissions().upload}>
                  <button
                    onClick={handleUploadRevision}
                    class="w-full py-2.5 bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Revisi
                  </button>
                </Show>
              

              {/* TAMPILAN EMPTY STATE AKSI DOKUMEN */}
              <Show
                when={
                  !(currentUser()?.role === "admin" || currentUser()?.name === doc().created_by) &&
                  !permissions().download &&
                  !permissions().edit_metadata &&
                  !permissions().upload
                }
              >
                <div class="p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p class="text-xs text-gray-500 font-bold">Tidak Ada Aksi Tersedia</p>
                  <p class="text-[10px] text-gray-400 mt-1">Anda hanya memiliki akses untuk melihat (preview) dokumen ini.</p>
                </div>
              </Show>
            </div>

            {/* ======================================= */}
            {/* PANEL WORKFLOW APPROVAL */}
            {/* ======================================= */}
            <div class=" rounded-xl  flex flex-col gap-3">
              <h3 class="text-[11px] font-bold text-black-400 uppercase tracking-wider">
                Approval Workflow
              </h3>

              {/* KONDISI 1: DOKUMEN MASIH DRAFT/REJECTED -> BISA MENGAJUKAN APPROVAL */}
              <Show
                when={
                  (doc()?.approval_status === "DRAFT" ||
                    doc()?.approval_status === "REJECTED") &&
                  permissions().upload
                }
              >
                <div class="space-y-3">
                  <p class="text-xs text-gray-600">
                    Ajukan dokumen ini untuk direview oleh atasan/rekan.
                  </p>

                  {/* WRAPPER RELATIVE UNTUK AUTOCOMPLETE */}
                  <div class="relative w-full">
                    <input
                      type="text"
                      placeholder="Ketik nama approver..."
                      value={approverFullName()}
                      onInput={handleApproverInput}
                      onFocus={() => {
                        if (approverFullName()) setShowSuggestions(true);
                      }}
                      class="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />

                    {/* DROPDOWN SUGGESTIONS */}
                    <Show
                      when={
                        showSuggestions() &&
                        (userSuggestions().length > 0 ||
                          isSearchingUsers() ||
                          approverFullName().trim() !== "")
                      }
                    >
                      <div class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-48 overflow-y-auto flex flex-col">
                        <Show when={isSearchingUsers()}>
                          <div class="p-3 text-xs text-gray-500 text-center flex justify-center items-center gap-2">
                            <svg
                              class="animate-spin h-3 w-3 text-gray-400"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                class="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                stroke-width="4"
                              ></circle>
                              <path
                                class="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Mencari...
                          </div>
                        </Show>

                        <Show
                          when={
                            !isSearchingUsers() && userSuggestions().length > 0
                          }
                        >
                          <For each={userSuggestions()}>
                            {(user) => (
                              <div
                                onClick={() => selectApprover(user)}
                                class="px-3 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 transition"
                              >
                                <div class="text-sm font-medium text-gray-800">
                                  {user.username}
                                </div>
                                <div class="text-[10px] text-gray-500">
                                  {user.full_name}
                                </div>
                              </div>
                            )}
                          </For>
                        </Show>

                        <Show
                          when={
                            !isSearchingUsers() &&
                            userSuggestions().length === 0 &&
                            approverFullName().trim() !== ""
                          }
                        >
                          <div class="p-3 text-xs text-gray-500 text-center italic">
                            Pengguna tidak ditemukan.
                          </div>
                        </Show>
                      </div>
                    </Show>
                  </div>

                  <button
                    onClick={async () => {
                      if (!approverFullName())
                        Swal.fire({
                          icon: "warning",
                          title: "Peringatan",
                          text: "Isi nama approver terlebih dahulu!",
                        });
                      setIsProcessing(true);
                      try {
                        await api.post(
                          `/documents/${documentId}/request-approval`,
                          { approverFullName: approverFullName() },
                        );

                        Swal.fire({
                          icon: "success",
                          title: "Berhasil",
                          text: "Dokumen berhasil diajukan untuk direview!",
                          timer: 2000,
                          showConfirmButton: false,
                        });

                        // Bersihkan form setelah sukses
                        setApproverFullName("");
                        setShowSuggestions(false);
                        fetchDocumentDetail(); // Refresh halaman
                      } catch (err) {
                        Swal.fire({
                          icon: "error",
                          title: "Gagal Mengajukan",
                          text:
                            err.response?.data?.message ||
                            "Gagal mengajukan approval.",
                        });
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing()}
                    class="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    {isProcessing() ? "Memproses..." : "Ajukan Approval"}
                  </button>
                </div>
              </Show>

              {/* KONDISI 2: DOKUMEN PENDING -> MENUNGGU APPROVAL (Untuk Peminta) */}
              <Show
                when={
                  doc()?.approval_status === "UNDER REVIEW" &&
                  currentUser()?.id !== activeApproval()?.id_approver
                }
              >
                <div class="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-sm flex items-start gap-3">
                  <div class="bg-amber-100 p-2 rounded-lg text-amber-600 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-bold text-amber-900">Menunggu Review</p>
                    <div class="mt-2 space-y-1">
                      <p class="text-xs text-amber-800 flex justify-between gap-4">
                        <span class="opacity-75">Pengaju:</span> 
                        <span class="font-semibold">{activeApproval()?.requester_name}</span>
                      </p>
                      <p class="text-xs text-amber-800 flex justify-between gap-4">
                        <span class="opacity-75">Reviewer:</span> 
                        <span class="font-semibold">{activeApproval()?.approver_name}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </Show>

              {/* KONDISI 3: DOKUMEN PENDING -> PANEL AKSI UNTUK SANG APPROVER */}
              <Show
                when={
                  doc()?.approval_status === "UNDER REVIEW" &&
                  currentUser()?.id === activeApproval()?.id_approver
                }
              >
                <div class="bg-indigo-50 border border-indigo-200 p-4 rounded-xl shadow-sm space-y-4">
                  <div class="flex items-center gap-3 text-indigo-900">
                    <div class="bg-indigo-100 p-1.5 rounded-lg shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p class="text-sm">
                      <span class="font-bold">{activeApproval()?.requester_name}</span> meminta Anda mereview dokumen ini.
                    </p>
                  </div>
                  
                  <textarea
                    placeholder="Tulis catatan review di sini (Opsional)..."
                    value={approvalNotes()}
                    onInput={(e) => setApprovalNotes(e.target.value)}
                    class="w-full border border-indigo-200 bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-20 resize-none shadow-inner"
                  ></textarea>

                  <div class="flex gap-3">
                    <button
                      onClick={async () => {
                        setIsProcessing(true);
                        try {
                          await api.post(`/documents/${documentId}/respond-approval`, { status: "REJECTED", notes: approvalNotes() });
                          Swal.fire({ icon: "success", title: "Dokumen Ditolak", text: "Anda telah menolak pengajuan dokumen ini.", timer: 2000, showConfirmButton: false });
                          fetchDocumentDetail();
                        } catch (err) {
                          Swal.fire({ icon: "error", title: "Terjadi Kesalahan", text: "Gagal memproses penolakan dokumen." });
                        }
                        setIsProcessing(false);
                      }}
                      class="flex-1 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold rounded-lg text-sm transition shadow-sm flex justify-center items-center gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      Tolak
                    </button>

                    <button
                      onClick={async () => {
                        // ... (LOGIKA TETAP SAMA SEPERTI ASLINYA)
                        setIsProcessing(true);
                        try {
                          await api.post(`/documents/${documentId}/respond-approval`, { status: "APPROVED", notes: approvalNotes() });
                          Swal.fire({ icon: "success", title: "Dokumen Disetujui", text: "Anda telah menyetujui pengajuan dokumen ini.", timer: 2000, showConfirmButton: false });
                          fetchDocumentDetail();
                        } catch (err) {
                          Swal.fire({ icon: "error", title: "Terjadi Kesalahan", text: "Gagal memproses persetujuan dokumen." });
                        }
                        setIsProcessing(false);
                      }}
                      class="flex-1 py-2.5 bg-green-600 border border-transparent text-white hover:bg-green-700 font-bold rounded-lg text-sm transition shadow-sm flex justify-center items-center gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                      Setujui
                    </button>
                  </div>
                </div>
              </Show>

              {/* TAMPILAN EMPTY STATE APPROVAL WORKFLOW */}
              <Show
                when={
                  !(((doc()?.approval_status === "DRAFT" || doc()?.approval_status === "REJECTED") && permissions().upload) ||
                  doc()?.approval_status === "UNDER REVIEW")
                }
              >
                <div class="p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-xs text-gray-500 font-bold">Tidak Ada Tugas Persetujuan</p>
                  <p class="text-[10px] text-gray-400 mt-1">
                    {doc()?.approval_status === "APPROVED" 
                      ? "Dokumen ini telah disetujui dan disahkan." 
                      : "Anda tidak memiliki wewenang untuk memproses atau mengajukan dokumen ini."}
                  </p>
                </div>
              </Show>
            </div>

            {/* --- PEMBATAS --- */}
            <hr class="border-gray-100 my-2" />

            {/* METADATA INFO */}
            <div class="flex flex-col gap-4">
              <h3 class="text-[11px] font-bold text-black-400 uppercase tracking-widest mb-1">
                Informasi Dokumen
              </h3>

              {/* TAMPILAN NOTES JIKA STATUS APPROVED ATAU REJECTED */}
              <Show
                when={
                  (doc()?.approval_status === "APPROVED" || doc()?.approval_status === "REJECTED") &&
                  activeApproval()?.notes
                }
              >
               <div
                  class={`p-4 rounded-xl border relative overflow-hidden ${
                    doc()?.approval_status === "APPROVED"
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div class="flex items-center gap-2 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class={`h-4 w-4 ${doc()?.approval_status === "APPROVED" ? "text-green-600" : "text-red-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <p class="text-[11px] uppercase tracking-wider font-bold text-gray-600">Catatan Reviewer</p>
                  </div>
                  <p class="text-sm text-gray-800 italic leading-relaxed">
                    "{activeApproval()?.notes}"
                  </p>
                  
                  {/* Bagian ini yang diubah: Menggunakan Flexbox & Icon User */}
                  <div class="flex justify-end items-center gap-1.5 mt-3">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                    </svg>
                    <p class="text-xs font-semibold text-gray-600">
                      {activeApproval()?.approver_name}
                    </p>
                  </div>
                </div>
              </Show>

              {/* LIST METADATA (Grid/Flex dengan Ikon) */}
              <div class="space-y-4 mt-2">
                <div class="flex items-start gap-3">
                  <div class="p-2 bg-gray-50 rounded-lg text-gray-400 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <div>
                    <p class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Diunggah Oleh</p>
                    <p class="text-sm font-semibold text-gray-900">{doc()?.created_by}</p>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <div class="p-2 bg-gray-50 rounded-lg text-gray-400 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <p class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Tanggal Diunggah</p>
                    <p class="text-sm font-semibold text-gray-900">
                      {new Date(doc()?.created_at).toLocaleDateString("id-ID", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                    <p class="text-xs text-gray-500">
                      Pukul {new Date(doc()?.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <div class="p-2 bg-gray-50 rounded-lg text-gray-400 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                  </div>
                  <div>
                    <p class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Ukuran File</p>
                    <p class="text-sm font-semibold text-gray-900">{(doc()?.file_size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>

                {/* ========================================= */}
                {/* RENDER CUSTOM METADATA SECARA DINAMIS */}
                {/* ========================================= */}
                <Show when={doc()?.custom_metadata && Object.keys(doc().custom_metadata).length > 0}>
                  <div class="mt-4 pt-4 border-t border-dashed border-gray-200">
                    <h4 class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Metadata Khusus
                    </h4>
                    <div class="grid grid-cols-2 gap-3">
                      <For each={Object.entries(doc().custom_metadata)}>
                        {([key, value]) => (
                          <div class="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/50">
                            <span class="block text-[9px] text-indigo-400 uppercase font-bold tracking-wider mb-0.5">
                              {/* Mengganti underscore dengan spasi agar lebih rapi (cth: patient_name -> patient name) */}
                              {key.replace(/_/g, ' ')}
                            </span>
                            <span class="text-xs font-semibold text-gray-800 break-words">{value}</span>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            </div>

            {/* --- PEMBATAS --- */}
            <hr class="border-gray-100 my-2" />

            {/* RIWAYAT AKTIVITAS (AUDIT LOG TIMELINE) */}
            <div class="flex flex-col flex-1 min-h-[250px]">
              {/* Header dengan Dropdown Filter */}
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-[11px] font-bold text-black-400 uppercase tracking-widest flex items-center gap-2">
                  <span>Document History</span>
                  <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">
                    {filteredLogs().length}
                  </span>
                </h3>

                {/* Dropdown Filter Action yang Dipercantik */}
                <div class="relative inline-block">
                  <select
                    value={logFilter()}
                    onInput={(e) => setLogFilter(e.target.value)}
                    class="appearance-none bg-white border border-gray-200 text-gray-600 font-semibold text-xs rounded-lg pl-3 pr-8 py-1.5 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                  >
                    <option value="ALL">Semua Aktivitas</option>
                    <option value="PREVIEW">Preview</option>
                    <option value="DOWNLOAD">Download</option>
                    <option value="UPLOAD">Upload Revisi</option>
                  </select>
                  {/* Custom Chevron Icon */}
                  <div class="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Timeline Container */}
              <div class="relative border-l-2 border-gray-100 ml-3 pl-4 space-y-6 overflow-y-auto pr-2 pb-4 max-h-[280px]">
                <Show
                  when={filteredLogs().length > 0}
                  fallback={
                    <div class="text-xs text-gray-400 italic mt-2">
                      {logs().length > 0
                        ? `Tidak ada riwayat aktivitas untuk filter "${logFilter()}".`
                        : "Belum ada riwayat aktivitas sama sekali."}
                    </div>
                  }
                >
                  <For each={filteredLogs()}>
                    {(log) => (
                      <div class="relative group">
                        {/* Bulatan Timeline dengan Ring Putih (Efek memotong garis) */}
                        <div
                          class={`absolute -left-[21px] top-2.5 w-2.5 h-2.5 rounded-full ring-4 ring-white z-10 shadow-sm transition-transform group-hover:scale-110 ${
                            log.action === "UPLOAD"
                              ? "bg-blue-500"
                              : log.action === "DOWNLOAD"
                              ? "bg-green-500"
                              : "bg-purple-500"
                          }`}
                        ></div>

                        {/* Card Konten dengan Hover Effect */}
                        <div class="flex flex-col p-3 -mt-2 -ml-2 rounded-xl border border-transparent hover:border-gray-100 hover:bg-gray-50 hover:shadow-sm transition-all">
                          
                          {/* Hierarki 1: Nama & Waktu */}
                          <div class="flex items-center justify-between gap-2 mb-2">
                            <span class="text-sm font-bold text-gray-900">
                              {log.actor_name || "Sistem"}
                            </span>
                            <span class="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })}{" "}
                              • {new Date(log.timestamp).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>

                          {/* Hierarki 2: Aksi (Badge + Ikon) & Detail */}
                          <div class="flex items-start gap-2">
                            <span
                              class={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shrink-0 border ${
                                log.action === "UPLOAD"
                                  ? "bg-blue-50 text-blue-700 border-blue-100"
                                  : log.action === "DOWNLOAD"
                                  ? "bg-green-50 text-green-700 border-green-100"
                                  : "bg-purple-50 text-purple-700 border-purple-100"
                              }`}
                            >
                              {/* Ikon Dinamis Berdasarkan Aksi */}
                              {log.action === "UPLOAD" ? (
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                              ) : log.action === "DOWNLOAD" ? (
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              )}
                              {log.action}
                            </span>
                            
                            <span
                              class="text-[11px] text-gray-500 leading-snug mt-0.5 break-words"
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

            {/* --- PEMBATAS --- */}
            <hr class="border-gray-100 my-1 shrink-0" />

            {/* ======================================= */}
            {/* VIEW BARU: RIWAYAT VERSI (DOCUMENT VERSIONS) */}
            {/* ======================================= */}
            <div class="flex flex-col shrink-0 mb-4">
              <h3 class="text-[11px] font-bold text-black-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span>Versi Dokumen</span>
                <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">{versions().length}</span>
              </h3>
              
              <div class="space-y-3">
                <Show when={versions().length > 0} fallback={<div class="text-xs text-gray-400 italic">Memuat riwayat versi...</div>}>
                  <For each={versions()}>
                    {(v) => (
                      <div class={`p-3 rounded-lg border ${v.is_active ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'} flex justify-between items-center transition-all`}>
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="font-bold text-sm text-gray-800">Versi {v.version_number}</span>
                            <Show when={v.is_active}>
                              <span class="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold border border-blue-200">AKTIF</span>
                            </Show>
                            <Show when={!v.is_active && v.approval_status !== 'APPROVED'}>
                              <span class="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded font-bold border border-gray-200">{v.approval_status}</span>
                            </Show>
                          </div>
                          <p class="text-[10px] text-gray-500 mt-1">
                            {new Date(v.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year:'numeric'})} • Oleh: {v.created_by} 
                          </p>
                        </div>
                        
                        {/* Tombol Rollback (Hanya Tampil Jika Tidak Aktif & User adalah Admin/Pemilik) */}
                        <Show when={!v.is_active && (currentUser()?.role === "admin" || currentUser()?.name === doc()?.created_by)}>
                          <button 
                            onClick={() => handleRollback(v.id_version, v.version_number)}
                            class="text-[10px] font-bold px-3 py-1.5 bg-white border border-gray-300 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded transition shadow-sm whitespace-nowrap"
                          >
                            Rollback
                          </button>
                        </Show>
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

      {/* MODAL EDIT METADATA */}
      <Show when={isEditMetadataOpen()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-xl shadow-lg w-[400px] p-6 max-h-[90vh] overflow-y-auto">
            <h3 class="text-lg font-bold mb-4 text-gray-800">
              Edit Metadata Khusus
            </h3>
            
            <Show 
              when={Object.keys(editMetadataForm()).length > 0}
              fallback={
                <div class="text-sm text-gray-500 italic mb-6 text-center py-4 bg-gray-50 rounded border border-dashed">
                  Dokumen ini tidak memiliki skema metadata khusus.
                </div>
              }
            >
              <form onSubmit={submitEditMetadata} class="space-y-4">
                <For each={Object.keys(editMetadataForm())}>
                  {(key) => (
                    <div>
                      <label class="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                        {key.replace(/_/g, ' ')}
                      </label>
                      <input
                        type="text"
                        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition"
                        value={editMetadataForm()[key] || ""}
                        onInput={(e) => 
                          setEditMetadataForm({
                            ...editMetadataForm(),
                            [key]: e.target.value
                          })
                        }
                      />
                    </div>
                  )}
                </For>
                
                <div class="flex justify-end gap-2 pt-4 border-t mt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditMetadataOpen(false)}
                    class="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={editMetadataLoading()}
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {editMetadataLoading() ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </Show>

            {/* Tombol Tutup jika fallback (kosong) muncul */}
            <Show when={Object.keys(editMetadataForm()).length === 0}>
              <div class="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditMetadataOpen(false)}
                  class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                >
                  Tutup
                </button>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default DocumentDetail;

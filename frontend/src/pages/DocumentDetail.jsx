import { createSignal, onMount, Show } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import api from "../api";
import { currentUser } from "../store/authStore";

function DocumentDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const documentId = params.id; // Mendapatkan ID dari URL: /document/:id

  const [doc, setDoc] = createSignal(null);
  const [loading, setLoading] = createSignal(true);
  
  // Nanti kita akan isi ini dari API berdasarkan tabel 'permission'
  const [permissions, setPermissions] = createSignal({
    preview: false,
    download: false,
    upload: false,
    edit_metadata: false
  });

  const fetchDocumentDetail = async () => {
    try {
      setLoading(true);
      // Endpoint ini harusnya mengembalikan detail dokumen + permission user tersebut
      const res = await api.get(`/documents/${documentId}`);
      setDoc(res.data.document);
      setPermissions(res.data.permissions); 
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
  const handleDownload = () => {
    if (doc()?.physical_filename) {
      window.open(`http://localhost:5000/uploads/${doc().physical_filename}`, "_blank");
    }
  };

  const handleEditMetadata = () => {
    alert("Fitur Edit Metadata akan memunculkan form di sini.");
  };

  const handleUploadRevision = () => {
    alert("Fitur Upload Versi Baru akan memunculkan modal file di sini.");
  };

  return (
    <div class="min-h-screen bg-gray-50 p-4 md:p-6 flex flex-col">
      
      {/* HEADER: Tombol Back & Judul */}
      <div class="flex items-center gap-4 mb-4">
        <button 
          onClick={() => navigate(-1)} 
          class="p-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-full transition shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 class="text-xl font-bold text-gray-800">
            {loading() ? "Memuat..." : doc()?.title || doc()?.file_name}
          </h1>
          <p class="text-xs text-gray-500">Document ID: {documentId}</p>
        </div>
      </div>

      <Show when={!loading() && doc()} fallback={<div class="flex-1 flex justify-center items-center text-gray-500">Memuat Dokumen...</div>}>
        <div class="flex flex-col lg:flex-row gap-6 flex-1 h-[calc(100vh-120px)]">
          
          {/* ======================================= */}
          {/* SISI KIRI: PREVIEW AREA (70% Lebar) */}
          {/* ======================================= */}
          <div class="flex-[3] bg-gray-800 rounded-xl shadow-inner overflow-hidden border border-gray-300 flex flex-col">
            <div class="bg-gray-900 px-4 py-2 flex justify-between items-center text-gray-300 text-sm">
              <span>Preview Panel</span>
              <span class="uppercase font-mono text-xs">{doc()?.file_name?.split('.').pop()}</span>
            </div>
            
            <div class="flex-1 w-full h-full relative">
              <Show 
                when={permissions().preview} 
                fallback={<div class="absolute inset-0 flex items-center justify-center text-gray-400">Anda tidak memiliki izin preview untuk dokumen ini.</div>}
              >
                {/* Jika file adalah PDF, kita bisa pakai iframe. 
                  Pastikan backend menyediakan endpoint untuk menyajikan file ini.
                */}
                <iframe 
                  src={`http://localhost:5000/uploads/${doc()?.physical_filename}`} 
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
              <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Actions</h3>
              
              <Show when={permissions().download}>
                <button onClick={handleDownload} class="w-full py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download File
                </button>
              </Show>

              <Show when={permissions().edit_metadata}>
                <button onClick={handleEditMetadata} class="w-full py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit Metadata
                </button>
              </Show>

              <Show when={permissions().upload}>
                <button onClick={handleUploadRevision} class="w-full py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  Upload New Version
                </button>
              </Show>
            </div>

            {/* METADATA INFO */}
            <div class="flex flex-col gap-4">
              <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Document Info</h3>
              
              <div>
                <p class="text-xs text-gray-500 mb-1">Status Approval</p>
                <span class={`px-2.5 py-1 rounded-md text-xs font-bold ${
                  doc()?.approval_status === "APPROVED" ? "bg-green-100 text-green-700" : 
                  doc()?.approval_status === "DRAFT" ? "bg-gray-100 text-gray-600" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {doc()?.approval_status || "UNKNOWN"}
                </span>
              </div>

              <div>
                <p class="text-xs text-gray-500 mb-1">Uploader</p>
                <p class="text-sm font-medium text-gray-800">{doc()?.created_by}</p>
              </div>

              <div>
                <p class="text-xs text-gray-500 mb-1">Tanggal Upload</p>
                <p class="text-sm font-medium text-gray-800">
                  {new Date(doc()?.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div>
                <p class="text-xs text-gray-500 mb-1">Ukuran File</p>
                <p class="text-sm font-medium text-gray-800">
                  {(doc()?.file_size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>

          </div>
        </div>
      </Show>
    </div>
  );
}

export default DocumentDetail;
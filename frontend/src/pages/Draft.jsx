import { createSignal, onMount, For, Show } from "solid-js";
import api from "../api";
import { currentUser } from "../store/authStore";
import { useNavigate } from "@solidjs/router";
import ManageAccessModal from "../components/ManageAccessModal";
import Swal from "sweetalert2";
import SearchBar from "../components/SearchBar";
import NewFolderModal from "../components/NewFolderModal";
import UploadDocumentModal from "../components/UploadDocumentModal";
import EditMetadataFolder from "../components/EditMetadataFolder";
import EditMetadataDoc from "../components/EditMetadataDoc";
import FolderDetailModal from "../components/FolderDetailModal";
import DocumentInfoModal from "../components/DocumentInfoModal";
import {
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
} from "../components/DropdownMenu";

function Draft() {
  // State khusus untuk Draft (Sudah diisolasi, tidak ada bentrok dengan Home)
  const navigate = useNavigate();
  const [stats, setStats] = createSignal({});
  const [draftId, setDraftId] = createSignal(null);
  const [isUploadOpen, setIsUploadOpen] = createSignal(false);
  const [uploadLoading, setUploadLoading] = createSignal(false);

  const [currentFolderId, setCurrentFolderId] = createSignal(null);
  const [folders, setFolders] = createSignal([]);
  const [documents, setDocuments] = createSignal([]);
  const [breadcrumbs, setBreadcrumbs] = createSignal([]);
  const [isFolderModalOpen, setIsFolderModalOpen] = createSignal(false);

  // State untuk modal permission folder
  const [isFolderAccessModalOpen, setIsFolderAccessModalOpen] =
    createSignal(false);
  const [selectedFolderId, setSelectedFolderId] = createSignal(null);

  const [isFolderDetailModalOpen, setIsFolderDetailModalOpen] =
    createSignal(false);
  const [selectedFolderDetail, setSelectedFolderDetail] = createSignal(null);

  const [isEditMetadataFolderOpen, setIsEditMetadataFolderOpen] =
    createSignal(false);
  const [selectedFolderName, setSelectedFolderName] = createSignal("");
  const [selectedFolderSchema, setSelectedFolderSchema] = createSignal([]);

  // State untuk modal permission document
  const [isDocumentAccessModalOpen, setIsDocumentAccessModalOpen] =
    createSignal(false);
  const [selectedDocumentId, setSelectedDocumentId] = createSignal(null);

  const [isDocumentDetailModalOpen, setIsDocumentDetailModalOpen] =
    createSignal(false);
  const [selectedDocumentDetail, setSelectedDocumentDetail] =
    createSignal(null);

  const [isEditMetadataDocumentOpen, setIsEditMetadataDocumentOpen] =
    createSignal(false);
  const [selectedDocumentTitle, setSelectedDocumentTitle] = createSignal("");
  const [selectedDocumentSchema, setSelectedDocumentSchema] = createSignal({});

  // --- STATE UNTUK CUSTOM METADATA ---
  // Menyimpan skema dari folder yang sedang dibuka (contoh: ["nama_pasien", "ruangan"])
  const [currentFolderSchema, setCurrentFolderSchema] = createSignal([]);
  // Menyimpan hasil ketikan user (contoh: { nama_pasien: "John Doe", ruangan: "ICU" })
  const [customMetadata, setCustomMetadata] = createSignal({});

  const [isSearching, setIsSearching] = createSignal(false);

  // ==========================================
  // FUNGSI API (Sesuai dengan kode asli Anda)
  // ==========================================

  const fetchStats = async () => {
    try {
      const res = await api.get("/documents/stats");
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadUserDraft = async () => {
    try {
      const draftFolder = await api.get("/folders/getdraft");
      console.log("draftFolder:", Object.values(draftFolder));
      
      // console.log("CurrentUser().id", currentUser().id);

      // console.log("isi variabel Draft Folder",draftFolder);

      // console.log("Draft ID:", draftFolder.data.id_folder);
      setDraftId(draftFolder.data.id_folder);

      // Langsung muat isi draft setelah ID didapatkan
      loadFolderContents(draftFolder.data.id_folder);
    } catch (error) {
      console.error("Gagal meload draft", error);
    }
  };

  const loadFolderContents = async (folderId = draftId()) => {
    if (!folderId) return; // Mencegah error jika ID belum ada

    try {
      const url = folderId ? `/folders?parentId=${folderId}` : `/folders`;
      const res = await api.post(url, {
        id_folder: folderId,
      });

      setFolders(res.data.folders);
      setDocuments(res.data.documents);

      const activeFolderId = res.data.currentFolderId;
      setCurrentFolderId(activeFolderId);

      // console.log("metadata", res.data.currentFolderMetadata);

      // MENANGKAP METADATA SCHEMA DARI FOLDER YANG DIBUKA
      // (Asumsi backend Anda mengirimkan data folder saat ini di res.data.currentFolder)
      if (res.data.currentFolderMetadata) {
        // Karena di database kita simpan sebagai JSONB Array, kita langsung set
        setCurrentFolderSchema(res.data.currentFolderMetadata);
      } else {
        // Kosongkan jika folder ini tidak punya aturan khusus (atau jika di Root)
        setCurrentFolderSchema({});
      }

      setCustomMetadata({}); // Reset isian form setiap kali pindah folder
      // Logika Breadcrumbs Draft
      if (activeFolderId && activeFolderId !== draftId()) {
        loadBreadcrumbs(activeFolderId);
      } else {
        setBreadcrumbs([]); // Kosongkan jika di Root Draft
      }
    } catch (error) {
      console.error("Gagal memuat isi folder draft:", error);
    }
  };

  const loadBreadcrumbs = async (folderId) => {
    try {
      const res = await api.post(`/folders/${folderId}/breadcrumbs`, {
        userId: currentUser().id,
      });
      setBreadcrumbs(res.data);
    } catch (err) {
      console.error("Gagal memuat breadcrumbs draft", err);
    }
  };

  const executeSearch = async (keyword, type) => {
    // <-- Menerima tipe dari SearchBar
    setIsSearching(true);
    setUploadLoading(true);

    try {
      const res = await api.get(
        `/documents/search?q=${keyword}&type=${type}&location=draft`, // <-- Gunakan type argumen
      );

      setFolders([]);
      setDocuments(res.data.data);
      setBreadcrumbs([
        { id_folder: "search", folder_name: `Hasil Pencarian: "${keyword}"` },
      ]);
    } catch (err) {
      alert(err.response?.data?.message || "Gagal melakukan pencarian");
    } finally {
      setUploadLoading(false);
    }
  };

  const clearSearch = () => {
    setIsSearching(false);
    loadFolderContents(null); // Kembali ke Root Home
  };

  const fetchFolderMetadataSchema = async (folderId) => {
    try {
      const res = await api.get(`/folders/${folderId}/metadata`);
      setSelectedFolderName(res.data.folder_name);
      setSelectedFolderSchema(res.data.metadata_schema || {});
      setSelectedFolderDetail(res.data);
      return res.data;
    } catch (error) {
      console.error("Gagal mengambil metadata schema folder:", error);
      return null;
    }
  };

  const openFolderDetail = async (folderId) => {
    const detail = await fetchFolderMetadataSchema(folderId);
    if (detail) {
      setIsFolderDetailModalOpen(true);
    }
  };

  const fetchDocumentMetadata = async (documentId) => {
    try {
      const res = await api.get(`/documents/${documentId}/metadata`);
      const docMetadata = res.data?.document || {};
      setSelectedDocumentTitle(docMetadata.file_name || "");
      setSelectedDocumentSchema(docMetadata.custom_metadata || {});
      setSelectedDocumentDetail(docMetadata);
      return res.data;
    } catch (error) {
      console.error("Gagal mengambil metadata document:", error);
      return null;
    }
  };

  const openDocumentDetail = async (documentId) => {
    const detail = await fetchDocumentMetadata(documentId);
    if (detail) {
      setSelectedDocumentId(documentId);
      setIsDocumentDetailModalOpen(true);
    }
  };

  // ==========================================
  // LIFECYCLE & NAVIGASI
  // ==========================================

  onMount(() => {
    fetchStats();
    loadUserDraft();
  });

  const navigateToFolder = (folderId) => {
    loadFolderContents(folderId);
  };

  const handleBack = () => {
    const crumbs = breadcrumbs();
    // Jika ada lebih dari 1 crumb (berarti ada parent), mundur 1 langkah
    if (crumbs.length > 1) {
      navigateToFolder(crumbs[crumbs.length - 2].id_folder);
    } else {
      // Jika kembali ke pangkal, arahkan ke root Draft
      navigateToFolder(draftId());
    }
  };

  // ==========================================
  // HANDLERS (UPLOAD, DELETE, DOWNLOAD)
  // ==========================================

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus dokumen?",
      text: "Anda tidak akan bisa mengembalikan dokumen ini!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/documents/${id}`);
      Swal.fire({
        icon: "success",
        title: "Terhapus!",
        text: "Dokumen berhasil dihapus.",
        timer: 1500,
        showConfirmButton: false,
      });
      loadFolderContents(currentFolderId() || draftId());
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal menghapus dokumen.",
      });
    }
  };

  const handleDeleteFolder = async (folderId) => {
    const result = await Swal.fire({
      title: "Hapus Folder?",
      text: "Folder HANYA bisa dihapus jika kosong (tidak ada sub-folder atau dokumen aktif di dalamnya).",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus Folder!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      // Pastikan endpoint backend ini sudah sesuai dengan route Anda
      await api.delete(`/folders/${folderId}`);

      Swal.fire({
        icon: "success",
        title: "Terhapus!",
        text: "Folder berhasil dihapus secara permanen.",
        timer: 1500,
        showConfirmButton: false,
      });

      // Refresh tampilan folder
      loadFolderContents(currentFolderId() || draftId());
    } catch (err) {
      // Jika backend melempar error "Folder tidak kosong", pesan itu akan muncul di sini
      Swal.fire({
        icon: "error",
        title: "Gagal Menghapus",
        text:
          err.response?.data?.message ||
          "Terjadi kesalahan saat menghapus folder.",
      });
    }
  };

  // ==========================================
  // TAMPILAN (VIEW)
  // ==========================================
  return (
    <div class="card p-6">
      {/* STATS CARDS */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="card p-5 border-l-4 border-l-gray-400">
          <p class="text-gray-500 text-xs mb-1.5 font-semibold uppercase tracking-wide">
            My Drafts
          </p>
          <h3 class="text-3xl font-bold text-gray-800">
            {stats().totalDrafts || 0}
          </h3>
        </div>

        <div class="card p-5 border-l-4 border-l-amber-400">
          <p class="text-gray-500 text-xs mb-1.5 font-semibold uppercase tracking-wide">
            PENDING
          </p>
          <h3 class="text-3xl font-bold text-gray-800">
            {stats().underReview || 0}
          </h3>
        </div>

        <div class="card p-5 border-l-4 border-l-blue-400">
          <p class="text-gray-500 text-xs mb-1.5 font-semibold uppercase tracking-wide">
            New (Last 7 Days)
          </p>
          <h3 class="text-3xl font-bold text-gray-800">
            {stats().newDocuments || 0}
          </h3>
        </div>

        <div class="card p-5 border-l-4 border-l-primary-500">
          <p class="text-gray-500 text-xs mb-1.5 font-semibold uppercase tracking-wide">
            Action Required
          </p>
          <h3 class="text-3xl font-bold text-primary-600">
            {stats().pendingApprovals || 0}
          </h3>
        </div>
      </div>

      {/* HEADER MY DRAFT */}
      <div class="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 border-b pb-4">
        {/* WRAPPER BREADCRUMB & TOMBOL BACK */}
        <div class="flex items-center gap-3 mb-4">
          
          {/* TOMBOL BACK DRAFT (Tampil jika BUKAN di root draft) */}
          <Show when={currentFolderId() !== draftId()}>
            <button
              onClick={handleBack}
              class="p-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition shadow-sm shrink-0"
              title="Kembali ke folder sebelumnya"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
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
          </Show>

          {/* BREADCRUMB UI CONTAINER */}
          <nav class="flex items-center text-sm font-medium text-gray-600 bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm flex-1 overflow-x-auto hide-scrollbar">
            
            {/* Tombol Root Draft ("My Personal Documents") */}
            <button
              onClick={() => navigateToFolder(draftId())}
              class={`hover:text-blue-600 flex items-center gap-1.5 transition whitespace-nowrap ${
                currentFolderId() === draftId() ? "text-blue-700 font-bold pointer-events-none" : ""
              }`}
            >
              {/* Ikon Draft Asli Milik Anda */}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M5 19V5v4.475V9zm3-6h3.525q.425 0 .713-.288t.287-.712t-.288-.712t-.712-.288H8q-.425 0-.712.288T7 12t.288.713T8 13m0 4h3.525q.425 0 .713-.288t.287-.712t-.288-.712t-.712-.288H8q-.425 0-.712.288T7 16t.288.713T8 17m0-8h8q.425 0 .713-.288T17 8t-.288-.712T16 7H8q-.425 0-.712.288T7 8t.288.713T8 9M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v4.45q0 .425-.288.713T20 10.45t-.712-.287T19 9.45V5H5v14h4q.425 0 .713.288T10 20t-.288.713T9 21zm10.225-5.725Q14.5 14.55 14.5 13.5t.725-1.775T17 11t1.775.725t.725 1.775t-.725 1.775T17 16t-1.775-.725M17 17q.975 0 1.938.188t1.862.562q.575.225.888.738T22 19.6v.4q0 .425-.288.713T21 21h-8q-.425 0-.712-.288T12 20v-.4q0-.6.313-1.112t.887-.738q.9-.375 1.863-.562T17 17"/></svg>
              My Personal Documents
            </button>

            {/* Looping State Breadcrumb */}
            <For each={breadcrumbs()}>
              {(crumb) => (
                <Show when={crumb.id_folder !== draftId()}>
                  <div class="flex items-center shrink-0">
                    {/* Ikon Pemisah Chevron */}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mx-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                    <button
                      onClick={() => navigateToFolder(crumb.id_folder)}
                      class={`hover:text-blue-600 truncate max-w-[150px] transition ${
                        currentFolderId() === crumb.id_folder ? "text-blue-700 font-bold pointer-events-none" : ""
                      }`}
                      title={crumb.folder_name}
                    >
                      {crumb.folder_name}
                    </button>
                  </div>
                </Show>
              )}
            </For>
          </nav>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsFolderModalOpen(true)}
            class="btn-outline flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            New Sub-Folder
          </button>
          <button
            onClick={() => setIsUploadOpen(true)}
            class="btn-primary flex items-center gap-2"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Upload to Draft
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* --- SEARCH BAR AREA --- */}
      {/* ========================================== */}
      <SearchBar
        isSearching={isSearching()}
        onSearch={executeSearch}
        onClear={clearSearch}
        placeholder="Cari draft dokumen, pengunggah, atau metadata..."
      />

      {/* --- KONTEN AREA MY DRAFT (LIST VIEW GOOGLE DRIVE STYLE) --- */}
      <Show when={folders().length > 0 || documents().length > 0}>
        <div class="overflow-x-auto mt-4">
          <table class="w-full text-left border-collapse">
            <thead class="border-b border-gray-300 text-gray-600 text-sm">
              <tr>
                <th class="py-3 px-4 font-medium">Nama</th>
                <th class="py-3 px-4 font-medium">Pemilik</th>
                <th class="py-3 px-4 font-medium">Tanggal diubah</th>
                <th class="py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody class="text-sm text-gray-700">
              {/* 1. RENDER FOLDER DRAFT TERLEBIH DAHULU */}
              <For each={folders()}>
                {(folder) => (
                  <tr
                    onClick={() => navigateToFolder(folder.id_folder)}
                    class="border-b border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer group"
                  >
                    <td class="py-3 px-4 flex items-center gap-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="w-5 h-5 text-gray-500 shrink-0 group-hover:text-blue-500 transition-colors"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      </svg>
                      <span class="font-medium text-gray-800 group-hover:text-blue-600 transition-colors truncate">
                        {folder.folder_name}
                      </span>
                    </td>
                    <td class="py-3 px-4 truncate">{folder.created_by}</td>
                    <td class="py-3 px-4 text-gray-400">
                      {folder.created_at
                        ? new Date(folder.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </td>
                    <td class="py-3 px-4 text-gray-400">—</td>
                    {/* Tampilkan tombol HANYA jika user adalah Admin atau Pembuat Folder */}
                    <Show
                      when={
                        currentUser()?.role === "admin" ||
                        currentUser()?.name === folder.created_by
                      }
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // MENCEGAH MASUK KE DALAM FOLDER
                          setSelectedFolderId(folder.id_folder);
                          setIsFolderAccessModalOpen(true);
                        }}
                        class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Manage Access"
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
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      </button>
                    </Show>

                    {/* TOMBOL DELETE FOLDER */}
                    <Show
                      when={
                        currentUser()?.role === "admin" ||
                        currentUser()?.name === folder.created_by
                      }
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // SANGAT PENTING: Agar klik tombol tidak memicu masuk ke dalam folder
                          handleDeleteFolder(folder.id_folder);
                        }}
                        class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition ml-1"
                        title="Hapus Folder"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </Show>

                    <DropdownMenu>
                      <DropdownItem
                        label="Kelola Akses"
                        icon={
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                        }
                        onClick={() => {
                          setSelectedFolderId(folder.id_folder);
                          setIsFolderAccessModalOpen(true);
                        }}
                      />

                      <DropdownItem
                        label="Detail Folder"
                        icon={
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        }
                        onClick={() => openFolderDetail(folder.id_folder)}
                      />

                      <DropdownDivider />

                      <DropdownItem
                        label="Edit Metadata"
                        icon={
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
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
                        }
                        onClick={() => {
                          setSelectedFolderId(folder.id_folder);
                          fetchFolderMetadataSchema(folder.id_folder);
                          setIsEditMetadataFolderOpen(true);
                        }}
                      />

                      <DropdownDivider />

                      <DropdownItem
                        label="Hapus Folder"
                        danger={true}
                        icon={
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        }
                        onClick={() => handleDeleteFolder(folder.id_folder)}
                      />
                    </DropdownMenu>
                  </tr>
                )}
              </For>

              {/* 2. RENDER DOKUMEN DRAFT DI BAWAH FOLDER */}
              <For each={documents()}>
                {(doc) => (
                  <tr
                    onClick={() => navigate(`/document/${doc.id_document}`)}
                    class="border-b border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer group"
                  >
                    <td class="py-3 px-4">
                      <div class="flex items-start gap-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="w-5 h-5 text-blue-500 shrink-0 mt-0.5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v6h6v10H6z" />
                          <path d="M8 12h8v2H8zm0 4h5v2H8z" />
                        </svg>
                        <div class="min-w-0">
                          <span class="font-medium text-gray-800 group-hover:text-blue-600 transition-colors truncate block">
                            {/* Gunakan highlights title jika ada (dari Elasticsearch) */}
                            {doc.highlights?.title ? (
                              <span innerHTML={doc.highlights.title[0]} />
                            ) : (
                              doc.title || doc.file_name
                            )}
                          </span>

                          {/* --- TAMPILAN HIGHLIGHT FULL-TEXT SEARCH (ELASTICSEARCH) --- */}
                          <Show when={doc.highlights && doc.highlights.content}>
                            <div class="mt-1 text-xs text-gray-500 max-w-2xl leading-relaxed italic border-l-2 border-yellow-300 pl-2">
                              <span
                                innerHTML={`"...${doc.highlights.content.join(" ... ")}..."`}
                              />
                            </div>
                          </Show>

                          {/* Tampilkan Nilai Relevansi (BM25 Score) Jika Ada */}
                          <Show when={doc.score}>
                            <span class="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block border border-gray-200">
                              Relevansi: {doc.score.toFixed(2)}
                            </span>
                          </Show>
                        </div>
                      </div>
                    </td>

                    <td class="py-3 px-4 truncate align-top pt-4">
                      {doc.created_by || doc.uploader || "-"}
                    </td>

                    <td class="py-3 px-4 text-gray-500 align-top pt-4">
                      {/* Safety check agar tidak muncul 'Invalid Date' jika kosong */}
                      {doc.created_at
                        ? new Date(doc.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </td>

                    <td class="py-3 px-4 align-top pt-4">
                      <span
                        class={`px-2 py-1 rounded text-xs font-medium ${
                          doc.approval_status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : doc.approval_status === "DRAFT"
                              ? "bg-gray-100 text-gray-600"
                              : doc.approval_status === "PENDING"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {doc.approval_status || "UNKNOWN"}
                      </span>
                    </td>

                    {/* TOMBOL DELETE (Sembunyi saat searching) */}
                    <td class="py-3 px-4 align-top pt-3 text-right">
                      <Show
                        when={
                          !isSearching() &&
                          (currentUser()?.role === "admin" ||
                            (currentUser()?.name === doc.created_by &&
                              (doc.approval_status === "DRAFT" ||
                                doc.approval_status === "REJECTED")))
                        }
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc.id_document);
                          }}
                          class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Hapus Dokumen"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </Show>

                      <DropdownMenu>
                        <DropdownItem
                          label="Kelola Akses"
                          icon={
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                              />
                            </svg>
                          }
                          onClick={() => {
                            setSelectedDocumentId(doc.id_document);
                            setIsDocumentAccessModalOpen(true);
                          }}
                        />

                        <DropdownDivider />

                        <DropdownItem
                          label="Detail Dokumen"
                          icon={
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          }
                          onClick={() => openDocumentDetail(doc.id_document)}
                        />

                        <DropdownDivider />

                        <DropdownItem
                          label="Edit Metadata"
                          icon={
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="h-4 w-4"
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
                          }
                          onClick={() => {
                            setSelectedDocumentId(doc.id_document);
                            fetchDocumentMetadata(doc.id_document);
                            setIsEditMetadataDocumentOpen(true);
                          }}
                        />

                        <DropdownDivider />

                        <DropdownItem
                          label="Hapus Dokumen"
                          danger={true}
                          icon={
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          }
                          onClick={() => handleDelete(doc.id_document)}
                        />
                      </DropdownMenu>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      {/* 3. Empty State My Draft */}
      <Show when={folders().length === 0 && documents().length === 0}>
        <div class="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm mt-4">
          Folder Draft masih kosong.
        </div>
      </Show>

      {/* MODAL UPLOAD KHUSUS DRAFT */}
      <Show when={isUploadOpen()}>
        {/* Modal Upload Document */}
        <UploadDocumentModal
          isOpen={isUploadOpen()}
          onClose={() => setIsUploadOpen(false)}
          folderId={currentFolderId()}
          schema={currentFolderSchema()}
          onSuccess={() => loadFolderContents(currentFolderId())}
        />
      </Show>

      {/* ========================================== */}
      {/* MODAL CREATE NEW FOLDER (KHUSUS DRAFT) */}
      {/* ========================================== */}
      <Show when={isFolderModalOpen()}>
        {/* Modal New Folder */}
        <NewFolderModal
          isOpen={isFolderModalOpen()}
          onClose={() => setIsFolderModalOpen(false)}
          parentId={currentFolderId()}
          onSuccess={() => loadFolderContents(currentFolderId())}
        />
      </Show>

      {/* MODAL MANAGE ACCESS UNTUK FOLDER */}
      <Show when={isFolderAccessModalOpen()}>
        <ManageAccessModal
          resourceId={selectedFolderId()}
          resourceType="FOLDER"
          onClose={() => {
            setIsFolderAccessModalOpen(false);
            setSelectedFolderId(null);
          }}
        />
      </Show>
      {/* MODAL MANAGE ACCESS UNTUK DOCUMENT */}
      <Show when={isDocumentAccessModalOpen()}>
        <ManageAccessModal
          resourceId={selectedDocumentId()}
          resourceType="DOCUMENT"
          onClose={() => {
            setIsDocumentAccessModalOpen(false);
            setSelectedDocumentId(null);
          }}
        />
      </Show>

      <Show when={isFolderDetailModalOpen()}>
        <FolderDetailModal
          folder={selectedFolderDetail()}
          onClose={() => {
            setIsFolderDetailModalOpen(false);
            setSelectedFolderDetail(null);
          }}
        />
      </Show>

      <Show when={isDocumentDetailModalOpen()}>
        <DocumentInfoModal
          document={selectedDocumentDetail()}
          onClose={() => {
            setIsDocumentDetailModalOpen(false);
            setSelectedDocumentDetail(null);
          }}
        />
      </Show>

      <Show when={isEditMetadataFolderOpen()}>
        <EditMetadataFolder
          folderId={selectedFolderId()}
          folder_name={selectedFolderName()}
          metadata_schema={selectedFolderSchema()}
          onClose={() => {
            setIsEditMetadataFolderOpen(false);
            setSelectedFolderId(null);
          }}
          onSuccess={() => loadFolderContents(currentFolderId() || draftId())}
        />
      </Show>

      <Show when={isEditMetadataDocumentOpen()}>
        <EditMetadataDoc
          documentId={selectedDocumentId()}
          title={selectedDocumentTitle()}
          custom_metadata={selectedDocumentSchema()}
          onClose={() => {
            setIsEditMetadataDocumentOpen(false);
            setSelectedDocumentId(null);
          }}
          onSuccess={() => loadFolderContents(currentFolderId() || draftId())}
        />
      </Show>
    </div>
  );
}

export default Draft;

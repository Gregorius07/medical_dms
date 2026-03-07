import { createSignal, onMount, For, Show } from "solid-js";
import api from "../api";
import { currentUser } from "../store/authStore";
import { useNavigate } from "@solidjs/router";
import ManageAccessModal from "../components/ManageAccessModal";
import Swal from "sweetalert2";

function Folder() {
  // ==========================================
  // STATE KHUSUS UNTUK HOME / FOLDER
  // ==========================================
  const navigate = useNavigate();
  const [isUploadOpen, setIsUploadOpen] = createSignal(false);
  const [uploadFile, setUploadFile] = createSignal(null);
  const [docTitle, setDocTitle] = createSignal("");
  const [uploadLoading, setUploadLoading] = createSignal(false);

  const [currentFolderId, setCurrentFolderId] = createSignal(null);
  const [folders, setFolders] = createSignal([]);
  const [documents, setDocuments] = createSignal([]);
  const [breadcrumbs, setBreadcrumbs] = createSignal([]);
  const [isFolderModalOpen, setIsFolderModalOpen] = createSignal(false);
  const [newFolderName, setNewFolderName] = createSignal("");
  const [folderLoading, setFolderLoading] = createSignal(false);

  // State untuk Search
  const [searchQuery, setSearchQuery] = createSignal("");
  const [searchType, setSearchType] = createSignal("metadata"); // 'metadata' atau 'fulltext'
  const [isSearching, setIsSearching] = createSignal(false);
  let searchTimeout; // Variabel penampung timer debounce

  // State untuk modal permission folder
  const [isFolderAccessModalOpen, setIsFolderAccessModalOpen] =
    createSignal(false);
  const [selectedFolderId, setSelectedFolderId] = createSignal(null);

  const loadFolderContents = async (folderId = null) => {
    try {
      const url = folderId ? `/folders?parentId=${folderId}` : `/folders`;

      const res = await api.post(url, {
        id_folder: folderId,
      });

      setFolders(res.data.folders);
      console.log(res.data.folders);
      
      setDocuments(res.data.documents);

      const activeFolderId = res.data.currentFolderId;
      setCurrentFolderId(activeFolderId);

      // Jika sedang berada di dalam sebuah folder, ambil jalur breadcrumbs-nya
      if (activeFolderId) {
        loadBreadcrumbs(activeFolderId);
      } else {
        setBreadcrumbs([]); // Kosongkan jika berada di Root (Home)
      }
    } catch (error) {
      console.error("Gagal memuat isi folder:", error);
    }
  };

  const loadBreadcrumbs = async (folderId) => {
    try {
      const res = await api.post(`/folders/${folderId}/breadcrumbs`, {
        userId: currentUser().id,
      });
      setBreadcrumbs(res.data);
    } catch (err) {
      console.error("Gagal memuat breadcrumbs", err);
    }
  };

  // ==========================================
  // LIFECYCLE & NAVIGASI
  // ==========================================
  onMount(() => {
    loadFolderContents();
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
      // Jika hanya ada 1 crumb, berarti parent-nya adalah Root
      navigateToFolder(null);
    }
  };

  // ==========================================
  // HANDLERS (UPLOAD, DELETE, DOWNLOAD)
  // ==========================================
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setUploadFile(file);
    if (!docTitle() && file) setDocTitle(file.name);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile()) {
      Swal.fire({
        title: "Error",
        text: "Pilih File terlebih dahulu",
        icon: "error",
      });
    }

    setUploadLoading(true);

    const formData = new FormData();
    formData.append("file", uploadFile());
    formData.append("title", docTitle());
    formData.append("uploaderId", currentUser().id);
    formData.append("uploaderName", currentUser().name);

    // Jika sedang di dalam folder, lampirkan ID foldernya
    if (currentFolderId()) {
      formData.append("folderId", currentFolderId());
    }

    try {
      await api.post("/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Swal.fire({
        title: "Success",
        text: "Upload Berhasil",
        icon: "success",
      });

      // Refresh Data
      setIsUploadOpen(false);
      setUploadFile(null);
      setDocTitle("");
      loadFolderContents(currentFolderId());
    } catch (err) {
      alert("Upload Gagal: " + (err.response?.data?.message || err.message));
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus dokumen ini?")) return;
    try {
      await api.delete(`/documents/${id}`);

      loadFolderContents(currentFolderId());
    } catch (err) {
      alert("Gagal hapus");
    }
  };

  const handleDownload = (filename) => {
    window.open(`http://localhost:5000/uploads/${filename}`, "_blank");
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName().trim())
      return alert("Nama folder tidak boleh kosong!");

    setFolderLoading(true);

    // Tentukan di mana folder ini akan dibuat (apakah di root draft atau di dalam sub-folder draft)
    const parentId = currentFolderId();

    try {
      await api.post("/folders/create", {
        folder_name: newFolderName(),
        parent_folder: parentId,
      });

      setIsFolderModalOpen(false);
      setNewFolderName("");

      // Refresh Data Draft agar folder baru langsung muncul di layar
      loadFolderContents(parentId);
    } catch (err) {
      alert(
        "Gagal membuat folder: " + (err.response?.data?.message || err.message),
      );
    } finally {
      setFolderLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault(); // Mencegah form me-reload halaman
    clearTimeout(searchTimeout); // Batalkan timer jika ada
    if (searchQuery().trim()) {
      executeSearch(searchQuery());
    }
  };

  const executeSearch = async (keyword) => {
    setIsSearching(true);
    setUploadLoading(true); // Indikator loading UI

    try {
      const res = await api.get(
        `/documents/search?q=${keyword}&type=${searchType()}`,
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

  const handleInputSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Hapus timer sebelumnya agar tidak mengeksekusi huruf yang belum selesai
    clearTimeout(searchTimeout);

    // Jika input dihapus habis, kembalikan ke layar normal seketika
    if (!value.trim()) {
      clearSearch();
      return;
    }

    // Setel timer baru (misal: 500ms atau 0.5 detik)
    searchTimeout = setTimeout(() => {
      executeSearch(value); // Eksekusi pencarian sesungguhnya
    }, 500);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
    loadFolderContents(null); // Kembali ke Root Home
  };

  // ==========================================
  // TAMPILAN (VIEW)
  // ==========================================
  return (
    <div class="space-y-6">
      {/* SECTION EXPLORER: HOME */}
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        {/* HEADER AREA */}
        <div class="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8 border-b pb-4">
          <div class="flex items-center gap-2 text-sm overflow-x-auto whitespace-nowrap">
            {/* TOMBOL BACK HOME (Tampil jika ada di dalam folder) */}
            <Show when={currentFolderId()}>
              <button
                onClick={handleBack}
                class="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-full transition mr-2"
                title="Kembali ke folder sebelumnya"
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
            </Show>

            <button
              onClick={() => navigateToFolder(null)}
              class="text-blue-600 hover:underline font-medium flex items-center gap-1"
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
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Home
            </button>

            <For each={breadcrumbs()}>
              {(crumb) => (
                <>
                  <span class="text-gray-400">/</span>
                  <button
                    onClick={() => navigateToFolder(crumb.id_folder)}
                    class={`hover:underline ${currentFolderId() === crumb.id_folder ? "text-gray-800 font-bold" : "text-blue-600"}`}
                  >
                    {crumb.folder_name}
                  </button>
                </>
              )}
            </For>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <Show when={currentUser()?.role === "admin"}>
              <button
                onClick={() => setIsFolderModalOpen(true)}
                class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
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
                New Folder
              </button>
            </Show>
            <button
              onClick={() => setIsUploadOpen(true)}
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition shadow-sm"
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
              Upload Document
            </button>
          </div>
        </div>

        {/* --- SEARCH BAR AREA --- */}
        <div class="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-6 flex flex-col sm:flex-row gap-3 items-center shadow-sm">
          <form onSubmit={handleSearch} class="flex-1 flex w-full">
            {/* Dropdown Tipe Pencarian */}
            <select
              value={searchType()}
              onChange={(e) => setSearchType(e.target.value)}
              class="bg-white border border-gray-300 text-gray-700 text-sm rounded-l-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 border-r-0"
            >
              <option value="metadata">Metadata Search</option>
              <option value="fulltext">Full-Text Search (Elastic)</option>
            </select>

            {/* Input Keyword */}
            <div class="relative flex-1">
              <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg
                  class="w-4 h-4 text-gray-400"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery()}
                onInput={handleInputSearch}
                class="bg-white border border-gray-300 text-gray-900 text-sm rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 outline-none"
                placeholder="Cari nama dokumen, pengunggah, atau metadata..."
              />
            </div>

            <button type="submit" class="hidden">
              Search
            </button>
          </form>

          {/* Tombol Clear Search (Muncul saat mode pencarian aktif) */}
          <Show when={isSearching()}>
            <button
              onClick={clearSearch}
              class="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition whitespace-nowrap"
            >
              Batal Pencarian
            </button>
          </Show>
        </div>

        {/* --- KONTEN AREA HOME (LIST VIEW) --- */}
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
                {/* 1. RENDER FOLDER */}
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
                      <td class="py-3 px-4 text-gray-400">—</td>
                      <td class="py-3 px-4 text-gray-400">—</td>
                      {/* Kolom Status/Action Tambahan */}
                      <td class="py-3 px-4 flex justify-end">
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
                      </td>
                    </tr>
                  )}
                </For>

                {/* 2. RENDER DOKUMEN */}
                <For each={documents()}>
                  {(doc) => (
                    <tr
                      onClick={() => navigate(`/document/${doc.id_document}`)}
                      class="border-b border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer group"
                    >
                      <td class="py-3 px-4 flex items-center gap-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="w-5 h-5 text-blue-500 shrink-0"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v6h6v10H6z" />
                          <path d="M8 12h8v2H8zm0 4h5v2H8z" />
                        </svg>
                        <span class="font-medium text-gray-800 group-hover:text-blue-600 transition-colors truncate">
                          {doc.title || doc.file_name}
                        </span>
                      </td>
                      <td class="py-3 px-4 truncate">{doc.created_by}</td>
                      <td class="py-3 px-4 text-gray-500">
                        {new Date(doc.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td class="py-3 px-4">
                        <span
                          class={`px-2 py-1 rounded text-xs font-medium ${
                            doc.approval_status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : doc.approval_status === "DRAFT"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {doc.approval_status}
                        </span>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>

        {/* 3. Empty State */}
        <Show when={folders().length === 0 && documents().length === 0}>
          <div class="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 mt-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-12 w-12 text-gray-300 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
              />
            </svg>
            <h3 class="text-sm font-medium text-gray-900">Folder Kosong</h3>
            <p class="text-xs text-gray-500 mt-1">
              Belum ada dokumen atau sub-folder di sini.
            </p>
          </div>
        </Show>
      </div>

      {/* MODAL UPLOAD KHUSUS HOME */}
      <Show when={isUploadOpen()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-xl shadow-lg w-[500px] p-6">
            <h3 class="text-lg font-bold mb-4">Upload to Home</h3>

            <form onSubmit={handleUpload} class="space-y-4">
              <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition cursor-pointer relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required
                />
                <div class="text-blue-600 font-medium mb-1">
                  Click to select file
                </div>
                <div class="text-xs text-gray-400 mb-2">
                  PDF, DOCX, XLS (Max 10MB)
                </div>
                <Show when={uploadFile()}>
                  <div class="text-sm text-green-600 font-bold bg-green-50 py-1 px-2 rounded inline-block">
                    {uploadFile()?.name}
                  </div>
                </Show>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  class="w-full border rounded-lg px-3 py-2 text-sm"
                  value={docTitle()}
                  onInput={(e) => setDocTitle(e.target.value)}
                />
              </div>

              <div class="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  class="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading()}
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  {uploadLoading() ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* ========================================== */}
      {/* MODAL CREATE NEW FOLDER (KHUSUS DRAFT) */}
      {/* ========================================== */}
      <Show when={isFolderModalOpen()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          {/* Animasi sederhana menggunakan transform */}
          <div class="bg-white rounded-xl shadow-2xl w-[400px] overflow-hidden">
            {/* Header Modal */}
            <div class="bg-purple-50 px-6 py-4 border-b border-purple-100 flex items-center gap-3">
              <div class="bg-purple-200 text-purple-700 p-2 rounded-lg">
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
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-800">
                Create New Sub-Folder
              </h3>
            </div>

            {/* Form Input */}
            <form onSubmit={handleCreateFolder} class="p-6 space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  autofocus
                  class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  value={newFolderName()}
                  onInput={(e) => setNewFolderName(e.target.value)}
                  placeholder="Contoh: Laporan Mingguan"
                />
              </div>

              {/* Tombol Aksi */}
              <div class="flex justify-end gap-2 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFolderModalOpen(false);
                    setNewFolderName("");
                  }}
                  class="px-4 py-2 text-gray-600 hover:bg-gray-100 font-medium rounded-lg text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={folderLoading()}
                  class="px-5 py-2 bg-purple-600 text-white font-medium rounded-lg text-sm hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {folderLoading() ? (
                    <>
                      <svg
                        class="animate-spin h-4 w-4 text-white"
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
                      Creating...
                    </>
                  ) : (
                    "Create Folder"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
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
    </div>
  );
}

export default Folder;

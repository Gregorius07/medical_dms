import { createSignal, onMount, createEffect } from "solid-js";
import api from "../api";
import { currentUser } from "../store/authStore"; //untuk userdata
function Dashboard() {
  const [stats, setStats] = createSignal({});

  // State untuk section Home
  const [isUploadOpen, setIsUploadOpen] = createSignal(false);
  const [uploadFile, setUploadFile] = createSignal(null);
  const [docTitle, setDocTitle] = createSignal("");
  const [uploadLoading, setUploadLoading] = createSignal(false);
  const [currentFolderId, setCurrentFolderId] = createSignal(null);
  const [folders, setFolders] = createSignal([]);
  const [breadcrumbs, setBreadcrumbs] = createSignal([]);
  const [documents, setDocuments] = createSignal([]);

  // State untuk section My Draft
  const [draftId, setdraftId] = createSignal(null);
  const [isUploadOpenDraft, setIsUploadOpenDraft] = createSignal(false);
  const [uploadFileDraft, setUploadFileDraft] = createSignal(null);
  const [docTitleDraft, setDocTitleDraft] = createSignal("");
  const [uploadLoadingDraft, setUploadLoadingDraft] = createSignal(false);
  const [foldersDraft, setFoldersDraft] = createSignal([]);
  const [currentFolderIdDraft, setCurrentFolderIdDraft] = createSignal(null);
  const [breadcrumbsDraft, setBreadcrumbsDraft] = createSignal([]);
  const [documentsDraft, setDocumentsDraft] = createSignal([]);

  const fetchStats = async () => {
    try {
      const res = await api.get("/dashboard/stats");
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDocuments = async () => {
    try {
      // Ambil 10 dokumen terbaru
      const res = await api.get("/documents?page=1&size=10");
      setDocuments(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFolderContents = async (folderId = null) => {
    try {
      const url = folderId ? `/folders?parentId=${folderId}` : `/folders`; //kalo ada folderId, kirim sebagai query

      const res = await api.post(url, {
        id_folder: folderId,
      });

      setFolders(res.data.folders);
      console.log(res.data.folders);

      setDocuments(res.data.documents);
      console.log(res.data.documents);

      const activeFolderId = res.data.currentFolderId;
      console.log(activeFolderId);
      setCurrentFolderId(activeFolderId);

      // Jika sedang berada di dalam sebuah folder, ambil jalur breadcrumbs-nya
      if (activeFolderId) {
        loadBreadcrumbs(activeFolderId);
      } else {
        setBreadcrumbs([]); // Kosongkan jika berada di Root
      }
    } catch (error) {}
  };

  // 2. Mengambil jalur navigasi (Breadcrumbs)
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

  const loadBreadcrumbsDraft = async (folderId) => {
    try {
      const res = await api.post(`/folders/${folderId}/breadcrumbs`, {
        userId: currentUser().id,
      });
      setBreadcrumbsDraft(res.data);
    } catch (err) {
      console.error("Gagal memuat breadcrumbs draft", err);
    }
  };

  const loadUserDraft = async () => {
    try {
      const draftFolder = await api.post("/folders/getdraft", {
        userId: currentUser().id,
      });
      console.log(draftFolder.data.id_folder);
      setdraftId(draftFolder.data.id_folder);
      loadDraftContent(draftId());
    } catch (error) {
      console.error("Gagal meload draft", error);
    }
  };

  const loadDraftContent = async (folderId = draftId()) => {
    try {
      const url = folderId ? `/folders?parentId=${folderId}` : `/folders`; //kalo ada folderId, kirim sebagai query
      const res = await api.post(url, {
        id_folder: folderId,
      });

      setFoldersDraft(res.data.folders);
      setDocumentsDraft(res.data.documents);

      const activeFolderId = res.data.currentFolderId;
      setCurrentFolderIdDraft(activeFolderId);

      // Jika sedang berada di dalam sebuah folder, ambil jalur breadcrumbs-nya
      // Di dalam loadDraftContent:
      if (activeFolderId && activeFolderId !== draftId()) {
        loadBreadcrumbsDraft(activeFolderId);
      } else {
        setBreadcrumbsDraft([]); // Kosongkan jika di Root Draft
      }
    } catch (error) {
      console.error("Gagal memuat isi folder:", error);
    }
  };

  onMount(() => {
    loadUserDraft();
    fetchStats();
    loadFolderContents();
  });

  const navigateToFolder = (folderId) => {
    loadFolderContents(folderId);
  };
  const navigateToFolderDraft = (folderId) => {
    loadDraftContent(folderId);
  };

  // Logika Tombol Back Home
  const handleBackHome = () => {
    const crumbs = breadcrumbs();
    // Jika ada lebih dari 1 crumb (berarti ada parent), mundur 1 langkah
    if (crumbs.length > 1) {
      navigateToFolder(crumbs[crumbs.length - 2].id_folder);
    } else {
      // Jika hanya ada 1 crumb, berarti parent-nya adalah Root
      navigateToFolder(null);
    }
  };

  // Logika Tombol Back Draft
  const handleBackDraft = () => {
    const crumbs = breadcrumbsDraft();
    if (crumbs.length > 1) {
      navigateToFolderDraft(crumbs[crumbs.length - 2].id_folder);
    } else {
      // Jika kembali ke pangkal, arahkan ke root Draft
      navigateToFolderDraft(draftId());
    }
  };
  const handleFileChange = (e, section) => {
    const file = e.target.files[0];
    if (section === "draft") {
      setUploadFileDraft(file);
      if (!docTitleDraft() && file) setDocTitleDraft(file.name);
    } else {
      setUploadFile(file);
      if (!docTitle() && file) setDocTitle(file.name);
    }
  };

  const handleUpload = async (e, section) => {
    e.preventDefault();
    const isDraft = section === "draft";

    const file = isDraft ? uploadFileDraft() : uploadFile();
    const title = isDraft ? docTitleDraft() : docTitle();
    // Tentukan tujuan folder
    const targetFolderId = isDraft
      ? currentFolderIdDraft() || draftId()
      : currentFolderId();

    if (!file) return alert("Pilih file terlebih dahulu!");

    isDraft ? setUploadLoadingDraft(true) : setUploadLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("uploaderId", currentUser().id);
    formData.append("uploaderName", currentUser().name);

    if (targetFolderId) {
      formData.append("folderId", targetFolderId);
    }

    try {
      await api.post("/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Upload Berhasil!");
      fetchStats();

      // Reset Modal & Refresh Data sesuai section
      if (isDraft) {
        setIsUploadOpenDraft(false);
        setUploadFileDraft(null);
        setDocTitleDraft("");
        loadDraftContent(currentFolderIdDraft() || draftId());
      } else {
        setIsUploadOpen(false);
        setUploadFile(null);
        setDocTitle("");
        loadFolderContents(currentFolderId());
      }
    } catch (err) {
      alert("Upload Gagal: " + (err.response?.data?.message || err.message));
    } finally {
      isDraft ? setUploadLoadingDraft(false) : setUploadLoading(false);
    }
  };

  const handleDelete = async (id, section) => {
    if (!confirm("Hapus dokumen ini?")) return;
    try {
      await api.delete(`/documents/${id}`);
      fetchStats();
      if (section === "draft") {
        loadDraftContent(currentFolderIdDraft() || draftId());
      } else {
        loadFolderContents(currentFolderId());
      }
    } catch (err) {
      alert("Gagal hapus");
    }
  };

  const handleDownload = (filename) => {
    // Buka file di tab baru (Backend menyajikan static file di /uploads)
    window.open(`http://localhost:5000/uploads/${filename}`, "_blank");
  };

  return (
    <div>
      {/* STATS CARDS (Sama seperti sebelumnya) */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p class="text-gray-500 text-sm mb-2">Total Documents</p>
          <h3 class="text-3xl font-bold text-gray-800">
            {stats().totalDocuments || 0}
          </h3>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p class="text-gray-500 text-sm mb-2">Pending Approval</p>
          <h3 class="text-3xl font-bold text-gray-800">
            {stats().pendingApproval || 0}
          </h3>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p class="text-gray-500 text-sm mb-2">New Documents</p>
          <h3 class="text-3xl font-bold text-gray-800">
            {stats().newDocuments || 0}
          </h3>
        </div>
      </div>

      {/* --- SECTION EXPLORER: BREADCRUMBS, FOLDERS & DOCUMENTS --- */}
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        {/* HEADER AREA: Breadcrumbs (Kiri) & Action Buttons (Kanan) */}
        <div class="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8 border-b pb-4">
          <div class="flex items-center gap-2 text-sm overflow-x-auto whitespace-nowrap">
            {/* TOMBOL BACK HOME (Hanya tampil jika ada di dalam folder) */}
            <Show when={currentFolderId()}>
              <button
                onClick={handleBackHome}
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

          {/* SISI KANAN: Action Buttons */}
          <div class="flex items-center gap-2 shrink-0">
            {/* Tombol Tambah Folder (Persiapan fitur selanjutnya) */}
            <button
              onClick={() => alert("Fitur Tambah Folder akan segera hadir!")}
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

            {/* Tombol Upload Document */}
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

        {/* --- KONTEN AREA --- */}

        {/* --- KONTEN AREA HOME (LIST VIEW GOOGLE DRIVE STYLE) --- */}
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
                {/* 1. RENDER FOLDER TERLEBIH DAHULU */}
                <For each={folders()}>
                  {(folder) => (
                    <tr
                      onClick={() => navigateToFolder(folder.id_folder)}
                      class="border-b border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer group"
                    >
                      <td class="py-3 px-4 flex items-center gap-3">
                        {/* Ikon Folder Solid ala Google Drive */}
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
                    </tr>
                  )}
                </For>

                {/* 2. RENDER DOKUMEN DI BAWAH FOLDER */}
                <For each={documents()}>
                  {(doc) => (
                    <tr class="border-b border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer group">
                      <td class="py-3 px-4 flex items-center gap-3">
                        {/* Ikon File ala Google Docs (Biru) */}
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

        {/* 3. Empty State (Jika Folder & Dokumen Kosong) */}
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

      {/* ========================================== */}
      {/* SECTION 2: MY DRAFT EXPLORER */}
      {/* ========================================== */}
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        {/* HEADER MY DRAFT */}
        <div class="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 border-b pb-4">
          <div class="flex items-center gap-2 text-sm overflow-x-auto whitespace-nowrap">
            {/* TOMBOL BACK DRAFT (Hanya tampil jika bukan di root draft) */}
            <Show
              when={
                breadcrumbsDraft().length > 0
              }
            >
              <button
                onClick={handleBackDraft}
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
              onClick={() => navigateToFolderDraft(draftId())}
              class="text-purple-600 hover:underline font-bold flex items-center gap-1"
            >
              📝 My Draft
            </button>

            <For each={breadcrumbsDraft()}>
              {(crumb) => (
                // Sembunyikan crumb pertama jika itu adalah root draft agar tidak dobel nama
                <Show when={crumb.id_folder !== draftId()}>
                  <span class="text-gray-400">/</span>
                  <button
                    onClick={() => navigateToFolderDraft(crumb.id_folder)}
                    class={`hover:underline ${currentFolderIdDraft() === crumb.id_folder ? "text-gray-800 font-bold" : "text-purple-600"}`}
                  >
                    {crumb.folder_name}
                  </button>
                </Show>
              )}
            </For>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              onClick={() =>
                alert("Fitur Tambah Folder (Draft) akan segera hadir!")
              }
              class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              + New Sub-Folder
            </button>
            <button
              onClick={() => setIsUploadOpenDraft(true)}
              class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
            >
              ↑ Upload to Draft
            </button>
          </div>
        </div>

        {/* --- KONTEN AREA MY DRAFT (LIST VIEW GOOGLE DRIVE STYLE) --- */}
        <Show when={foldersDraft().length > 0 || documentsDraft().length > 0}>
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
                <For each={foldersDraft()}>
                  {(folder) => (
                    <tr
                      onClick={() => navigateToFolderDraft(folder.id_folder)}
                      class="border-b border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer group"
                    >
                      <td class="py-3 px-4 flex items-center gap-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="w-5 h-5 text-gray-500 shrink-0 group-hover:text-purple-500 transition-colors"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                        <span class="font-medium text-gray-800 group-hover:text-purple-600 transition-colors truncate">
                          {folder.folder_name}
                        </span>
                      </td>
                      <td class="py-3 px-4 truncate">{folder.created_by}</td>
                      <td class="py-3 px-4 text-gray-400">—</td>
                      <td class="py-3 px-4 text-gray-400">—</td>
                    </tr>
                  )}
                </For>

                {/* 2. RENDER DOKUMEN DRAFT DI BAWAH FOLDER */}
                <For each={documentsDraft()}>
                  {(doc) => (
                    <tr class="border-b border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer group">
                      <td class="py-3 px-4 flex items-center gap-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="w-5 h-5 text-purple-500 shrink-0"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v6h6v10H6z" />
                          <path d="M8 12h8v2H8zm0 4h5v2H8z" />
                        </svg>
                        <span class="font-medium text-gray-800 group-hover:text-purple-600 transition-colors truncate">
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
                          class={`px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700`}
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

        {/* 3. Empty State My Draft */}
        <Show
          when={foldersDraft().length === 0 && documentsDraft().length === 0}
        >
          <div class="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm mt-4">
            Folder Draft masih kosong.
          </div>
        </Show>
      </div>

      {/* MODAL UPLOAD */}
      <Show when={isUploadOpen() || isUploadOpenDraft()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-xl shadow-lg w-[500px] p-6">
            <h3 class="text-lg font-bold mb-4">
              {isUploadOpenDraft() ? "Upload to My Draft" : "Upload to Home"}
            </h3>

            {/* Form dikirim dengan indikator string 'draft' atau 'home' */}
            <form
              onSubmit={(e) =>
                handleUpload(e, isUploadOpenDraft() ? "draft" : "home")
              }
              class="space-y-4"
            >
              <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition cursor-pointer relative">
                <input
                  type="file"
                  onChange={(e) =>
                    handleFileChange(e, isUploadOpenDraft() ? "draft" : "home")
                  }
                  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required
                />
                <div class="text-blue-600 font-medium mb-1">
                  Click to select file
                </div>
                <div class="text-xs text-gray-400 mb-2">
                  PDF, DOCX, XLS (Max 10MB)
                </div>
                <Show
                  when={isUploadOpenDraft() ? uploadFileDraft() : uploadFile()}
                >
                  <div class="text-sm text-green-600 font-bold bg-green-50 py-1 px-2 rounded inline-block">
                    {isUploadOpenDraft()
                      ? uploadFileDraft()?.name
                      : uploadFile()?.name}
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
                  value={isUploadOpenDraft() ? docTitleDraft() : docTitle()}
                  onInput={(e) =>
                    isUploadOpenDraft()
                      ? setDocTitleDraft(e.target.value)
                      : setDocTitle(e.target.value)
                  }
                />
              </div>

              <div class="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadOpen(false);
                    setIsUploadOpenDraft(false);
                  }}
                  class="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isUploadOpenDraft() ? uploadLoadingDraft() : uploadLoading()
                  }
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  {(
                    isUploadOpenDraft() ? uploadLoadingDraft() : uploadLoading()
                  )
                    ? "Uploading..."
                    : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default Dashboard;

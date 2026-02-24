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
      
      const res = await api.post(url,{
        id_folder : folderId
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
      const res = await api.post(`/folders/${folderId}/breadcrumbs`,{
        userId : currentUser().id
      });
      setBreadcrumbs(res.data);
    } catch (err) {
      console.error("Gagal memuat breadcrumbs", err);
    } 
  };

  const loadUserDraft = async () =>{
    try {
      const draftFolder = await api.post('/folders/getdraft',{
        userId : currentUser().id
      });
      console.log(draftFolder.data.id_folder);
      setdraftId(draftFolder.data.id_folder);
    } catch (error) {
      console.error("Gagal meload draft", error);
    }
  }

  const fetchDraftMenu = async (folderId = draftId()) =>{
    try {
      const url = folderId ? `/folders?parentId=${folderId}` : `/folders`; //kalo ada folderId, kirim sebagai query
      const res = await api.post(url,{
        id_folder : folderId
      });

      setFoldersDraft(res.data.folders);
      setDocumentsDraft(res.data.documents);

      // const activeFolderId = res.data.currentFolderId;
      // setCurrentFolderId(activeFolderId);

      // // Jika sedang berada di dalam sebuah folder, ambil jalur breadcrumbs-nya
      // if (activeFolderId) {
      //   loadBreadcrumbs(activeFolderId);
      // } else {
      //   setBreadcrumbs([]); // Kosongkan jika berada di Root
      // }
    } catch (error) {
      console.error("Gagal memuat isi folder:", error);
    }
  }

  onMount(async () => {
    await loadUserDraft();
    fetchStats();
    loadFolderContents();
    fetchDraftMenu(draftId());
  });

  const navigateToFolder = (folderId) => {
    loadFolderContents(folderId);
  };

  const handleFileChange = (e) => {
    setUploadFile(e.target.files[0]);
    // Otomatis isi judul dari nama file jika judul kosong
    if (!docTitle() && e.target.files[0]) {
      setDocTitle(e.target.files[0].name);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile()) return alert("Pilih file dulu!");

    setUploadLoading(true);

    // Gunakan FormData untuk upload file
    const formData = new FormData();
    formData.append("file", uploadFile());
    formData.append("title", docTitle());
    formData.append("uploaderId", currentUser().id);
    formData.append("uploaderName", currentUser().name);
    formData.append("folderId", draftId()); // Nanti jika ada fitur folder
    try {
      await api.post("/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Upload Berhasil!");
      setIsUploadOpen(false);
      setUploadFile(null);
      setDocTitle("");

      // Refresh data
      fetchStats();
      // fetchDocuments();
      loadFolderContents(draftId());
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
      // fetchDocuments();
      fetchStats();
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
          
          {/* SISI KIRI: Breadcrumb Navigation */}
          <div class="flex items-center gap-2 text-sm overflow-x-auto whitespace-nowrap">
            <button
              onClick={() => navigateToFolder(null)}
              class="text-blue-600 hover:underline font-medium flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
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
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              New Folder
            </button>

            {/* Tombol Upload Document */}
            <button
              onClick={() => setIsUploadOpen(true)}
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Document
            </button>
          </div>
        </div>

        {/* --- KONTEN AREA --- */}

        {/* 1. Grid Sub-Folders */}
        <Show when={folders().length > 0}>
          <h4 class="text-gray-500 text-xs uppercase font-bold mb-3 tracking-wider">
            Folders
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <For each={folders()}>
              {(folder) => (
                <div
                  onClick={() => navigateToFolder(folder.id_folder)}
                  class="flex items-center gap-3 p-4 border rounded-xl hover:bg-blue-50 cursor-pointer transition border-gray-200 shadow-sm"
                >
                  <div class="w-10 h-10 rounded bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                    </svg>
                  </div>
                  <div class="font-medium text-gray-800 truncate w-full">
                    {folder.folder_name}
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* 2. List Documents */}
        <Show when={documents().length > 0}>
          <h4 class="text-gray-500 text-xs uppercase font-bold mb-3 tracking-wider">
            Files & Documents
          </h4>
          <div class="overflow-x-auto border border-gray-200 rounded-xl">
            <table class="w-full text-left">
              <thead class="bg-gray-50 text-gray-600 text-xs uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th class="px-4 py-3">Document Title</th>
                  <th class="px-4 py-3">Uploader</th>
                  <th class="px-4 py-3">Status</th>
                  <th class="px-4 py-3">Date</th>
                  <th class="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="text-sm divide-y divide-gray-100">
                <For each={documents()}>
                  {(doc) => (
                    <tr class="hover:bg-gray-50 transition">
                      <td class="px-4 py-3 font-medium text-gray-800 flex items-center gap-3">
                        {/* Ikon File Dokumen */}
                        <div class="text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          {doc.title || doc.file_name}
                          <div class="text-xs text-gray-400 font-normal mt-0.5">
                            {(doc.file_size / 1024).toFixed(2)} KB
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-3 text-gray-600">{doc.created_by}</td>
                      <td class="px-4 py-3">
                        <span class={`px-2 py-1 rounded text-xs font-bold ${
                            doc.approval_status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                            doc.approval_status === 'DRAFT' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                          {doc.approval_status}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-gray-500">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td class="px-4 py-3 text-right space-x-3">
                        <button
                          onClick={() => handleDownload(doc.physical_filename)}
                          class="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id_document)}
                          class="text-red-500 hover:text-red-700 font-medium text-sm"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>

        {/* 3. Empty State (Jika Folder kosong & tidak ada dokumen) */}
        <Show when={folders().length === 0 && documents().length === 0}>
           <div class="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
              <h3 class="text-sm font-medium text-gray-900">Folder Kosong</h3>
              <p class="text-xs text-gray-500 mt-1">Belum ada dokumen atau sub-folder di sini.</p>
           </div>
        </Show>

      </div>

      {/* SECTION DOKUMEN */}
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-bold text-gray-800 text-lg">My Draft</h3>
          <button
            onClick={() => setIsUploadOpen(true)}
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <span class="text-lg">+</span> Upload Document
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
              <tr>
                <th class="px-4 py-3">Document Title</th>
                <th class="px-4 py-3">Uploader</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3">Date</th>
                <th class="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="text-sm">
              {documentsDraft().length === 0 ? (
                <tr>
                  <td colspan="5" class="text-center py-6 text-gray-400">
                    No documents yet
                  </td>
                </tr>
              ) : (
                documentsDraft().map((doc) => (
                  <tr class="border-b last:border-0 hover:bg-gray-50">
                    <td class="px-4 py-3 font-medium text-gray-800">
                      {doc.title}
                      <div class="text-xs text-gray-400">
                        {doc.file_size} bytes • {doc.folder_name || "Root"}
                      </div>
                    </td>
                    <td class="px-4 py-3">{doc.created_by}</td>
                    <td class="px-4 py-3">
                      <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">
                        {doc.approval_status}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td class="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleDownload(doc.physical_filename)}
                        class="text-blue-600 hover:underline text-xs"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id_document)}
                        class="text-red-500 hover:text-red-700 text-xs"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL UPLOAD */}
      {isUploadOpen() && (
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-xl shadow-lg w-[500px] p-6">
            <h3 class="text-lg font-bold mb-4">Upload New Document</h3>
            <form onSubmit={handleUpload} class="space-y-4">
              <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition">
                <input
                  type="file"
                  onChange={handleFileChange}
                  class="hidden"
                  id="fileInput"
                />
                <label for="fileInput" class="cursor-pointer">
                  <div class="text-blue-600 font-medium mb-1">
                    Click to select file
                  </div>
                  <div class="text-xs text-gray-400">
                    PDF, DOCX, XLS (Max 10MB)
                  </div>
                  {uploadFile() && (
                    <div class="mt-2 text-sm text-green-600 font-bold bg-green-50 py-1 px-2 rounded">
                      {uploadFile().name}
                    </div>
                  )}
                </label>
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
                  placeholder="Contoh: SOP Pelayanan IGD"
                />
              </div>

              {/* Nanti di sini bisa tambah dropdown Folder */}

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
                  {uploadLoading() ? "Uploading" : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

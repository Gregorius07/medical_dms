import { createSignal, onMount, For, Show } from "solid-js";
import Swal from "sweetalert2";
import api from "../api";

function RecycleBin() {
  const [documents, setDocuments] = createSignal([]);
  const [isLoading, setIsLoading] = createSignal(false);

  const loadDeletedDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/documents/recycle-bin");
      setDocuments(res.data?.data || []);
    } catch (error) {
      console.error("Gagal mengambil recycle bin:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Tidak dapat memuat dokumen recycle bin.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (idDocument) => {
    const result = await Swal.fire({
      title: "Restore dokumen?",
      text: "Dokumen akan dikembalikan ke folder asal.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Restore",
      cancelButtonText: "Batal",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280",
    });

    if (!result.isConfirmed) return;

    try {
      await api.patch(`/documents/${idDocument}/restore`);
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Dokumen berhasil direstore.",
        timer: 1500,
        showConfirmButton: false,
      });
      loadDeletedDocuments();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Restore dokumen gagal.",
      });
    }
  };

  onMount(() => {
    loadDeletedDocuments();
  });

  return (
    <div class="card p-6">
      <div class="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 border-b pb-4">
        <div>
          <h2 class="text-xl font-bold text-gray-800">Recycle Bin</h2>
          <p class="text-sm text-gray-500 mt-1">
            Daftar dokumen yang telah dihapus sementara dan masih bisa direstore.
          </p>
        </div>
        <button
          onClick={loadDeletedDocuments}
          class="btn-outline flex items-center gap-2"
          disabled={isLoading()}
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      <Show when={!isLoading()} fallback={<p class="text-sm text-gray-500">Memuat recycle bin...</p>}>
        <Show
          when={documents().length > 0}
          fallback={
            <div class="py-12 text-center text-gray-500">
              Tidak ada dokumen di recycle bin.
            </div>
          }
        >
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead class="border-b border-gray-300 text-gray-600 text-sm">
                <tr>
                  <th class="py-3 px-4 font-medium">Nama Dokumen</th>
                  <th class="py-3 px-4 font-medium">Lokasi Folder</th>
                  <th class="py-3 px-4 font-medium">Pemilik</th>
                  <th class="py-3 px-4 font-medium">Status</th>
                  <th class="py-3 px-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="text-sm text-gray-700">
                <For each={documents()}>
                  {(doc) => (
                    <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td class="py-3 px-4 font-medium text-gray-800">{doc.file_name}</td>
                      <td class="py-3 px-4 text-gray-600">{doc.folder_name || "Root"}</td>
                      <td class="py-3 px-4 text-gray-600">{doc.created_by || "-"}</td>
                      <td class="py-3 px-4">
                        <span class="inline-flex px-2.5 py-1 text-xs rounded-full bg-red-100 text-red-700 font-semibold">
                          Deleted
                        </span>
                      </td>
                      <td class="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRestore(doc.id_document)}
                          class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </Show>
    </div>
  );
}

export default RecycleBin;

import { createSignal, onMount, For, Show } from "solid-js";
import Swal from "sweetalert2";
import api from "../api";
import { currentUser } from "../store/authStore";

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

  const handlePermanentDelete = async (idDocument) => {
    const result = await Swal.fire({
      title: "Hapus permanen dokumen?",
      text: "Dokumen akan dihapus secara permanen dan tidak bisa dikembalikan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus Permanen",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/documents/${idDocument}/permanent`);
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Dokumen berhasil dihapus secara permanen.",
        timer: 1500,
        showConfirmButton: false,
      });
      loadDeletedDocuments();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Delete permanen gagal.",
      });
    }
  };

  onMount(() => {
    loadDeletedDocuments();
  });

  return (
    <div class="card p-6">
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
                        <div class="inline-flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleRestore(doc.id_document)}
                            class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors"
                          >
                            Restore
                          </button>
                          <Show when={currentUser()?.role === "admin"}>
                            <button
                              onClick={() => handlePermanentDelete(doc.id_document)}
                              class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 transition-colors"
                            >
                              Hard Delete
                            </button>
                          </Show>
                        </div>
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

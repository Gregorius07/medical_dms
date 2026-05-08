import { createSignal, Show, For, onMount } from "solid-js";
import api from "../api";
import Swal from "sweetalert2";

function MoveFolderModal(props) {
  const [selectedFolderId, setSelectedFolderId] = createSignal(null);
  const [folders, setFolders] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [loadingFolders, setLoadingFolders] = createSignal(false);

  onMount(async () => {
    if (props.isOpen) {
      await fetchAccessibleFolders();
    }
  });

  const fetchAccessibleFolders = async () => {
    try {
      setLoadingFolders(true);
      const response = await api.get("/folders/accessible/dropdown");

      // Exclude the folder itself from target list
      const filtered = response.data.filter(
        (folder) => folder.id_folder !== props.folderId,
      );
      setFolders(filtered);
      setSelectedFolderId(null);
    } catch (err) {
      console.error("Error fetching accessible folders:", err);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err.response?.data?.message || "Gagal mengambil daftar folder yang dapat diakses",
      });
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleMoveFolder = async (e) => {
    e.preventDefault();

    // allow moving to Root (null) — but if selectedFolderId is null and user didn't choose, warn
    if (!selectedFolderId() && selectedFolderId() !== 0) {
      Swal.fire({
        icon: "warning",
        title: "Pilih Folder",
        text: "Silakan pilih folder tujuan terlebih dahulu atau pilih Root."
      });
      return;
    }

    const targetFolder = folders().find(f => f.id_folder === selectedFolderId());
    const targetName = targetFolder ? targetFolder.folder_name : "Root";

    const confirmResult = await Swal.fire({
      icon: "question",
      title: "Konfirmasi Pemindahan",
      text: `Pindahkan folder ini ke "${targetName}"?`,
      showCancelButton: true,
      confirmButtonText: "Ya, Pindahkan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33"
    });

    if (!confirmResult.isConfirmed) return;

    setLoading(true);
    try {
      await api.patch(`/folders/${props.folderId}/move`, {
        newParentId: selectedFolderId() || null,
      });

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: `Folder berhasil dipindahkan ke "${targetName}"`,
        timer: 1500,
        showConfirmButton: false,
      });

      setSelectedFolderId(null);
      props.onSuccess();
      props.onClose();
    } catch (err) {
      console.error("Error moving folder:", err);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err.response?.data?.message || "Gagal memindahkan folder"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Show when={props.isOpen}>
      <div class="modal-overlay">
        <div class="modal-card w-[450px]">
          <div class="modal-header">
            <h3 class="text-base font-bold text-gray-800">Pindahkan Folder</h3>
          </div>

          <form onSubmit={handleMoveFolder} class="modal-body space-y-5">
            <div>
              <label class="input-label">Pilih Folder Tujuan</label>
              <Show
                when={!loadingFolders()}
                fallback={<div class="input-field bg-gray-50 text-gray-600">Loading folders...</div>}
              >
                <select
                  class="input-field"
                  value={selectedFolderId() ?? ""}
                  onChange={(e) => setSelectedFolderId(e.target.value ? Number(e.target.value) : null)}
                  disabled={folders().length === 0}
                >
                  <option value="">-- Pilih Folder Tujuan --</option>
                  <For each={folders()}>
                    {(folder) => (
                      <option value={folder.id_folder}>{folder.folder_name}</option>
                    )}
                  </For>
                </select>
                <Show when={folders().length === 0}>
                  <p class="text-sm text-gray-500 mt-2">Tidak ada folder yang dapat diakses</p>
                </Show>
              </Show>
            </div>

            <div class="modal-footer">
              <button
                type="button"
                onClick={props.onClose}
                class="btn-ghost"
                disabled={loading()}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading() || folders().length === 0}
                class="btn-primary"
              >
                {loading() ? "Memindahkan..." : "Pindahkan"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
}

export default MoveFolderModal;

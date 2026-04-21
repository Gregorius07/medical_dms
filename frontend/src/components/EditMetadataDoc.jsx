import { createSignal, Show, For, createEffect } from "solid-js";
import api from "../api";
import Swal from "sweetalert2";

function EditMetadataDoc(props) {
  // 1. Tidak perlu state isEditMetadataOpen di sini.
  // Induk yang mengontrol kapan komponen ini muncul/hilang.

  // 2. Langsung inisialisasi form menggunakan data dari props saat komponen dirender.
  const [editMetadataForm, setEditMetadataForm] = createSignal({
    ...(props.custom_metadata || {}),
  });
  const [fileName, setFileName] = createSignal(props.title || "");
  const [editMetadataLoading, setEditMetadataLoading] = createSignal(false);

  createEffect(() => {
    // Setiap kali props.custom_metadata atau props.title berubah, update form.
    setEditMetadataForm({
      ...(props.custom_metadata || {}),
    });
    setFileName(props.title || "");
  });

  // Handler untuk menyimpan perubahan metadata ke backend
  const submitEditMetadata = async (e) => {
    e.preventDefault();
    setEditMetadataLoading(true);

    try {
      // 3. Gunakan props.documentId sesuai nama variabel yang dikirim dari parent
      await api.put(`/documents/${props.documentId}/metadata`, {
        custom_metadata: editMetadataForm(),
        file_name: fileName(),
      });

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Metadata dokumen berhasil diperbarui.",
        timer: 1500,
        showConfirmButton: false,
      });

      // 4. Panggil fungsi dari props untuk refresh data dan menutup modal
      props.onSuccess();
      props.onClose();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal Menyimpan",
        text:
          err.response?.data?.message ||
          "Terjadi kesalahan saat menyimpan metadata.",
      });
    } finally {
      setEditMetadataLoading(false);
    }
  };

  return (
    // Tidak perlu <Show> pembungkus di sini karena Parent sudah membungkusnya
    <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div class="bg-white rounded-xl shadow-lg w-[420px] max-h-[90vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-100">
          <h3 class="text-base font-bold text-gray-800">Edit Metadata</h3>
        </div>

        <Show
          when={Object.keys(editMetadataForm()).length > 0 || fileName()}
          fallback={
            <div class="p-6">
              <div class="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded border border-dashed">
                Dokumen ini tidak memiliki skema metadata.
              </div>
            </div>
          }
        >
          <form onSubmit={submitEditMetadata} class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                Title
              </label>
              <input
                type="text"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition"
                value={fileName() || ""}
                onInput={(e) => setFileName(e.target.value)}
              />
            </div>
            <Show when={Object.keys(editMetadataForm()).length > 0}>
              <label class="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                Tag
              </label>
            </Show>
            <For each={Object.keys(editMetadataForm())}>
              {(key) => (
                <div>
                  <label class="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    {key.replace(/_/g, " ")}
                  </label>
                  <input
                    type="text"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition"
                    value={editMetadataForm()[key] || ""}
                    onInput={(e) =>
                      setEditMetadataForm({
                        ...editMetadataForm(),
                        [key]: e.target.value,
                      })
                    }
                  />
                </div>
              )}
            </For>

            <div class="flex justify-end gap-2 pt-4 border-t mt-4">
              {/* 5. Gunakan props.onClose() saat tombol Batal diklik */}
              <button
                type="button"
                onClick={props.onClose}
                class="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-medium transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={editMetadataLoading()}
                class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium flex items-center gap-2 disabled:opacity-50 transition"
              >
                {editMetadataLoading() ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </Show>

        {/* Tombol Tutup jika fallback (kosong) muncul */}
        <Show
          when={Object.keys(editMetadataForm()).length === 0 && !fileName()}
        >
          <div class="flex justify-end p-6 pt-0 mt-4">
            <button
              type="button"
              onClick={props.onClose}
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
            >
              Tutup
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default EditMetadataDoc;

import { createSignal, Show, For, createEffect } from "solid-js";
import api from "../api";
import Swal from "sweetalert2";

const ALLOWED_FIELD_TYPES = ["text", "number", "date"];

const toFieldList = (metadataSchema) => {
  if (!metadataSchema || typeof metadataSchema !== "object") return [];

  return Object.entries(metadataSchema).map(([key, type]) => ({
    name: key.replace(/_/g, " "),
    type: ALLOWED_FIELD_TYPES.includes(type) ? type : "text",
  }));
};

function EditMetadataFolder(props) {
  const [folderName, setFolderName] = createSignal(props.folder_name || "");
  const [editMetadataLoading, setEditMetadataLoading] = createSignal(false);
  const [customFields, setCustomFields] = createSignal(
    toFieldList(props.metadata_schema),
  );
  const [newFieldName, setNewFieldName] = createSignal("");
  const [newFieldType, setNewFieldType] = createSignal("text");

  createEffect(() => {
    props.folderId;
    const incomingFolderName = props.folder_name || "";
    const incomingSchema = props.metadata_schema;

    setFolderName(incomingFolderName);
    setCustomFields(toFieldList(incomingSchema));
    setNewFieldName("");
    setNewFieldType("text");
  });

  const sanitizeFieldName = (name) =>
    name.trim().toLowerCase().replace(/\s+/g, "_");

  const updateFieldName = (index, value) => {
    setCustomFields((prev) =>
      prev.map((field, i) => (i === index ? { ...field, name: value } : field)),
    );
  };

  const updateFieldType = (index, value) => {
    const nextType = ALLOWED_FIELD_TYPES.includes(value) ? value : "text";
    setCustomFields((prev) =>
      prev.map((field, i) =>
        i === index ? { ...field, type: nextType } : field,
      ),
    );
  };

  const removeField = (indexToRemove) => {
    setCustomFields((prev) =>
      prev.filter((_, index) => index !== indexToRemove),
    );
  };

  const addField = () => {
    const rawFieldName = newFieldName().trim();
    if (!rawFieldName) return;

    const normalizedName = sanitizeFieldName(rawFieldName);
    const isDuplicate = customFields().some(
      (field) => sanitizeFieldName(field.name) === normalizedName,
    );

    if (isDuplicate) {
      Swal.fire({
        icon: "warning",
        title: "Tag Duplikat",
        text: "Nama field metadata tidak boleh duplikat.",
      });
      return;
    }

    setCustomFields((prev) => [
      ...prev,
      { name: rawFieldName, type: newFieldType() },
    ]);
    setNewFieldName("");
    setNewFieldType("text");
  };

  const buildMetadataSchemaPayload = () => {
    const metadataSchema = {};

    customFields().forEach((field) => {
      const key = sanitizeFieldName(field.name);
      if (!key) return;

      metadataSchema[key] = ALLOWED_FIELD_TYPES.includes(field.type)
        ? field.type
        : "text";
    });

    return Object.keys(metadataSchema).length > 0 ? metadataSchema : null;
  };

  const hasDuplicateFieldName = () => {
    const seen = new Set();

    for (const field of customFields()) {
      const normalized = sanitizeFieldName(field.name);
      if (!normalized) continue;
      if (seen.has(normalized)) return true;
      seen.add(normalized);
    }

    return false;
  };

  // Handler untuk menyimpan perubahan metadata ke backend
  const submitEditMetadata = async (e) => {
    e.preventDefault();
    if (!folderName().trim()) return;

    if (hasDuplicateFieldName()) {
      Swal.fire({
        icon: "warning",
        title: "Tag Duplikat",
        text: "Masih ada nama field metadata yang duplikat.",
      });
      return;
    }

    if (!props.folderId) {
      Swal.fire({
        icon: "error",
        title: "Folder Tidak Valid",
        text: "ID folder tidak ditemukan.",
      });
      return;
    }

    setEditMetadataLoading(true);

    try {
      await api.put(`/folders/${props.folderId}/metadata`, {
        metadata_schema: buildMetadataSchemaPayload(),
        folder_name: folderName().trim(),
      });

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Metadata folder berhasil diperbarui.",
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
          "Terjadi kesalahan saat menyimpan metadata folder.",
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
          when={Object.keys(customFields()).length > 0 || folderName()}
          fallback={
            <div class="p-6">
              <div class="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded border border-dashed">
                Folder ini tidak memiliki skema metadata.
              </div>
            </div>
          }
        ></Show>

        <Show when={customFields().length > 0 || folderName()}>
          <form onSubmit={submitEditMetadata} class="p-6 space-y-4">
            <div>
              <label class="input-label">Nama Folder</label>
              <input
                type="text"
                required
                class="input-field"
                value={folderName()}
                onInput={(e) => setFolderName(e.target.value)}
              />
            </div>

            <label class="input-label">Tag</label>
            <For each={customFields()}>
              {(field, index) => (
                <div class="border-t pt-4">
                  <div class="flex gap-2 mb-3">
                    <input
                      type="text"
                      class="flex-[2] input-field"
                      placeholder="Nama Field"
                      value={field.name}
                      onInput={(e) => updateFieldName(index(), e.target.value)}
                    />
                    <select
                      class="flex-[1] select-field"
                      value={field.type}
                      onChange={(e) => updateFieldType(index(), e.target.value)}
                    >
                      <option value="text">Teks</option>
                      <option value="number">Angka</option>
                      <option value="date">Tanggal</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeField(index())}
                      class="px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </For>

            <div class="border-t pt-4">
              <label class="input-label">Tambah Tag</label>
              <div class="flex gap-2 mb-3">
                <input
                  type="text"
                  class="flex-[2] input-field"
                  placeholder="Nama Field"
                  value={newFieldName()}
                  onInput={(e) => setNewFieldName(e.target.value)}
                />
                <select
                  class="flex-[1] select-field"
                  value={newFieldType()}
                  onChange={(e) => setNewFieldType(e.target.value)}
                >
                  <option value="text">Teks</option>
                  <option value="number">Angka</option>
                  <option value="date">Tanggal</option>
                </select>
                <button
                  type="button"
                  onClick={addField}
                  class="px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <For each={customFields()}>
                {(field, index) => (
                  <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {field.name} ({field.type})
                    <button
                      type="button"
                      onClick={() => removeField(index())}
                      class="text-red-500"
                    >
                      ×
                    </button>
                  </span>
                )}
              </For>
            </div>

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
        <Show when={customFields().length === 0 && !folderName()}>
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

export default EditMetadataFolder;

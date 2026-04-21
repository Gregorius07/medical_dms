import { For, Show } from "solid-js";

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return `${date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })} • ${date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

function FolderDetailModal(props) {
  const folder = () => props.folder || null;
  const metadataSchema = () => folder()?.metadata_schema || {};
  const schemaEntries = () => Object.entries(metadataSchema());

  return (
    <div class="modal-overlay" style="z-index: 9999;">
      <div class="modal-card w-[560px] max-h-[90vh] flex flex-col overflow-hidden">
        <div class="modal-header flex items-center justify-between gap-4">
          <div>
            <h3 class="text-base font-bold text-gray-800">Detail Folder</h3>
            <p class="text-xs text-gray-500 mt-1">
              Informasi ringkas folder dan skema metadata.
            </p>
          </div>
          <button
            onClick={props.onClose}
            class="text-gray-400 hover:text-gray-600 transition bg-white p-2 rounded-full shadow-sm"
            aria-label="Tutup modal"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="modal-body flex-1 overflow-y-auto space-y-5">
          <div class="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Nama Folder
            </p>
            <h4 class="mt-1 text-xl font-bold text-gray-900 break-words">
              {folder()?.folder_name || "-"}
            </h4>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-xl border border-gray-100 p-4 bg-white">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Pembuat Folder
              </p>
              <p class="mt-2 text-sm font-semibold text-gray-900 break-words">
                {folder()?.created_by || "-"}
              </p>
            </div>

            <div class="rounded-xl border border-gray-100 p-4 bg-white">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Waktu Folder Dibuat
              </p>
              <p class="mt-2 text-sm font-semibold text-gray-900">
                {formatDateTime(folder()?.created_at)}
              </p>
            </div>

            <div class="rounded-xl border border-gray-100 p-4 bg-white">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Pengubah Folder Terakhir
              </p>
              <p class="mt-2 text-sm font-semibold text-gray-900 break-words">
                {folder()?.updated_by || folder()?.created_by || "-"}
              </p>
            </div>

            <div class="rounded-xl border border-gray-100 p-4 bg-white">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Waktu Diubah
              </p>
              <p class="mt-2 text-sm font-semibold text-gray-900">
                {formatDateTime(folder()?.updated_at || folder()?.created_at)}
              </p>
            </div>

            <div class="rounded-xl border border-gray-100 p-4 bg-white sm:col-span-2">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Total Dokumen di Folder
              </p>
              <p class="mt-2 text-sm font-semibold text-gray-900">
                {folder()?.total_documents ?? 0} dokumen
              </p>
            </div>
          </div>

          <div class="rounded-2xl border border-gray-100 bg-white p-4">
            <div class="flex items-center justify-between gap-3 mb-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Skema Metadata Tambahan
                </p>
                <p class="text-sm text-gray-500 mt-1">
                  Tag yang bisa dipakai pada folder ini.
                </p>
              </div>
            </div>

            <Show
              when={schemaEntries().length > 0}
              fallback={
                <div class="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded border border-dashed border-gray-200">
                  Folder ini belum memiliki tag metadata tambahan.
                </div>
              }
            >
              <div class="flex flex-wrap gap-2">
                <For each={schemaEntries()}>
                  {([key, type]) => (
                    <span class="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                      <span>{key.replace(/_/g, " ")}</span>
                      <span class="text-indigo-400">•</span>
                      <span class="font-medium capitalize">{type}</span>
                    </span>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" onClick={props.onClose} class="btn-ghost">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default FolderDetailModal;
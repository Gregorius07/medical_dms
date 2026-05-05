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

const formatFileSize = (size) => {
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes < 0) return "-";

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

function DocumentInfoModal(props) {
  const doc = () => props.document || null;
  const metadata = () => doc()?.custom_metadata || {};
  const metadataEntries = () => Object.entries(metadata());

  return (
    <div class="modal-overlay" style="z-index: 9999;">
      <div class="modal-card w-[620px] max-h-[90vh] flex flex-col overflow-hidden">
        <div class="modal-header flex items-center justify-between gap-4">
          <div>
            <h3 class="text-base font-bold text-gray-800">Detail Dokumen</h3>
            <p class="text-xs text-gray-500 mt-1">
              Informasi lengkap dokumen, status, dan metadata tambahan.
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
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Nama Dokumen
                </p>
                <h4 class="mt-1 text-xl font-bold text-gray-900 break-words">
                  {doc()?.file_name || "-"}
                </h4>
              </div>
              <span
                class={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${
                  doc()?.approval_status === "APPROVED"
                    ? "bg-green-100 text-green-700"
                    : doc()?.approval_status === "DRAFT"
                      ? "bg-gray-100 text-gray-700"
                      : doc()?.approval_status === "PENDING" ||
                          doc()?.approval_status === "PENDING"
                        ? "bg-yellow-100 text-yellow-700"
                        : doc()?.approval_status === "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                }`}
              >
                {doc()?.approval_status || "UNKNOWN"}
              </span>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-xl border border-gray-100 p-4 bg-white">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Ukuran Dokumen
              </p>
              <p class="mt-2 text-sm font-semibold text-gray-900">
                {formatFileSize(doc()?.file_size)}
              </p>
            </div>

            <div class="rounded-xl border border-gray-100 p-4 bg-white">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Versi Aktif
              </p>
              <p class="mt-2 text-sm font-semibold text-gray-900">
                v{doc()?.version_number ?? "-"}
              </p>
            </div>

            <div class="rounded-xl border border-gray-100 p-4 bg-white">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Pembuat Dokumen
              </p>
              <p class="mt-2 text-sm font-semibold text-gray-900 break-words">
                {doc()?.created_by || "-"}
              </p>
            </div>

            <div class="rounded-xl border border-gray-100 p-4 bg-white">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Waktu Dokumen Dibuat
              </p>
              <p class="mt-2 text-sm font-semibold text-gray-900">
                {formatDateTime(doc()?.created_at)}
              </p>
            </div>

            <div class="rounded-xl border border-gray-100 p-4 bg-white">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Pengubah Dokumen Terakhir
              </p>
              <p class="mt-2 text-sm font-semibold text-gray-900 break-words">
                {doc()?.updated_by || doc()?.created_by || "-"}
              </p>
            </div>

            <div class="rounded-xl border border-gray-100 p-4 bg-white">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Waktu Diubah
              </p>
              <p class="mt-2 text-sm font-semibold text-gray-900">
                {formatDateTime(doc()?.updated_at || doc()?.created_at)}
              </p>
            </div>

            <div class="rounded-xl border border-gray-100 p-4 bg-white sm:col-span-2">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Lokasi Folder
              </p>
              <p class="mt-2 text-sm font-semibold text-gray-900 break-words">
                {doc()?.folder_location || "Root"}
              </p>
            </div>
          </div>

          <div class="rounded-2xl border border-gray-100 bg-white p-4">
            <div class="flex items-center justify-between gap-3 mb-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Metadata Tambahan (Tag)
                </p>
                <p class="text-sm text-gray-500 mt-1">
                  Daftar nilai metadata yang terpasang pada dokumen.
                </p>
              </div>
            </div>

            <Show
              when={metadataEntries().length > 0}
              fallback={
                <div class="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded border border-dashed border-gray-200">
                  Dokumen ini belum memiliki metadata tambahan.
                </div>
              }
            >
              <div class="space-y-2">
                <For each={metadataEntries()}>
                  {([key, value]) => (
                    <div class="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
                      <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span class="text-sm font-medium text-gray-800 text-right break-words">
                        {value === null || value === undefined || value === ""
                          ? "-"
                          : String(value)}
                      </span>
                    </div>
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

export default DocumentInfoModal;
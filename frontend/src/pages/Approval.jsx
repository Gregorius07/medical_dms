import { createSignal, createEffect, Show, For } from "solid-js";
import { useNavigate } from "@solidjs/router";
import api from "../api";

function Approval() {
  const navigate = useNavigate();
  
  // State untuk Tab Aktif (inbox, outbox, history)
  const [activeTab, setActiveTab] = createSignal("inbox");
  const [data, setData] = createSignal([]);
  const [loading, setLoading] = createSignal(false);

  // Fungsi untuk mengambil data berdasarkan tab yang aktif
  const fetchApprovals = async (tab) => {
    setLoading(true);
    setData([]); // Kosongkan data sementara memuat
    try {
      const res = await api.get(`/approvals/${tab}`);
      setData(res.data || []);
    } catch (err) {
      console.error(`Gagal memuat data ${tab}:`, err);
    } finally {
      setLoading(false);
    }
  };

  // Efek ini akan berjalan otomatis setiap kali nilai activeTab berubah
  createEffect(() => {
    fetchApprovals(activeTab());
  });

  return (
    <div class="min-h-screen bg-white p-4 md:p-6 flex flex-col">
      {/* HEADER
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Pusat Approval</h1>
        <p class="text-sm text-gray-500 mt-1">
          Kelola alur persetujuan dokumen administrasi Anda di sini.
        </p>
      </div> */}

      {/* TABS NAVIGATION */}
      <div class="flex border-b border-gray-200 mb-6 gap-6">
        <button
          onClick={() => setActiveTab("inbox")}
          class={`pb-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab() === "inbox"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Inbox (Perlu Review)
        </button>
        <button
          onClick={() => setActiveTab("outbox")}
          class={`pb-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab() === "outbox"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Outbox (Menunggu Jawaban)
        </button>
        <button
          onClick={() => setActiveTab("history")}
          class={`pb-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab() === "history"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Riwayat Approval
        </button>
      </div>

      {/* KONTEN TABEL */}
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-gray-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-600">
              <tr>
                <th class="py-4 px-6">Nama Dokumen</th>
                {/* Kolom Dinamis berdasarkan Tab */}
                <Show when={activeTab() === "inbox"}>
                  <th class="py-4 px-6">Diajukan Oleh</th>
                </Show>
                <Show when={activeTab() === "outbox"}>
                  <th class="py-4 px-6">Menunggu Approval</th>
                </Show>
                <Show when={activeTab() === "history"}>
                  <th class="py-4 px-6">Pihak Terkait</th>
                  <th class="py-4 px-6">Status</th>
                </Show>
                
                <th class="py-4 px-6">Tanggal Pengajuan</th>
                <th class="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            
            <tbody class="text-sm text-gray-700">
              <Show when={loading()}>
                <tr>
                  <td colspan="5" class="py-10 text-center text-gray-500 italic">
                    <div class="flex justify-center items-center gap-2">
                      <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Memuat data...
                    </div>
                  </td>
                </tr>
              </Show>

              <Show when={!loading() && data().length === 0}>
                <tr>
                  <td colspan="5" class="py-12 text-center text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Tidak ada data dokumen di tab ini.
                  </td>
                </tr>
              </Show>

              <Show when={!loading() && data().length > 0}>
                <For each={data()}>
                  {(item) => (
                    <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td class="py-4 px-6 font-medium text-gray-900 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                        </svg>
                        {item.file_name}
                      </td>

                      {/* Render Kolom Dinamis */}
                      <Show when={activeTab() === "inbox"}>
                        <td class="py-4 px-6">{item.requester_name}</td>
                      </Show>
                      
                      <Show when={activeTab() === "outbox"}>
                        <td class="py-4 px-6">{item.approver_name}</td>
                      </Show>
                      
                      <Show when={activeTab() === "history"}>
                        <td class="py-4 px-6 text-xs">
                          {/* Pengaju (Requester) */}
                          <div class="flex items-center gap-1.5 mb-1.5" title="Diajukan oleh">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span class="text-gray-700 font-medium truncate">{item.requester_name}</span>
                          </div>
                          
                          {/* Penyetuju (Approver) */}
                          <div class="flex items-center gap-1.5" title="Direview oleh">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-purple-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span class="text-gray-700 font-medium truncate">{item.approver_name}</span>
                          </div>
                        </td>
                        <td class="py-4 px-6">
                          <span class={`px-2.5 py-1 rounded-md text-xs font-bold ${
                            item.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </Show>

                      <td class="py-4 px-6 text-gray-500">
                        {new Date(item.request_date).toLocaleDateString("id-ID", {
                          day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </td>

                      <td class="py-4 px-6 text-right">
                        <button
                          onClick={() => navigate(`/document/${item.id_document}`)}
                          class="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition"
                        >
                          {activeTab() === "inbox" ? "Review Dokumen" : "Lihat Detail"}
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </Show>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Approval;
import { createSignal, Show, onMount, onCleanup } from "solid-js";
import { Portal } from "solid-js/web"; // Import Portal dari web module

export function DropdownMenu(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [coords, setCoords] = createSignal({ top: 0, left: 0 });
  let buttonRef; // Referensi untuk menangkap posisi tombol di layar

  // Fungsi untuk mengkalkulasi posisi dropdown
  const toggleMenu = (e) => {
    e.stopPropagation(); // Mencegah klik tembus ke tabel

    if (!isOpen()) {
      // Ambil koordinat pasti dari tombol titik tiga di layar
      const rect = buttonRef.getBoundingClientRect();

      // Kalkulasi: Dropdown w-56 (lebar 224px).
      // Posisikan tepat di bawah tombol (rect.bottom) + jarak 4px.
      // Sejajarkan ke kanan (rect.right - 224px).
      setCoords({
        top: rect.bottom + 4,
        left: rect.right - 224,
      });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Agar dropdown tertutup jika user men-scroll tabel atau layar (untuk mencegah menu melayang)
  onMount(() => {
    const handleClose = () => setIsOpen(false);
    // Gunakan argumen 'true' (useCapture) agar bisa mendeteksi scroll pada div tabel, bukan hanya window
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);

    onCleanup(() => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    });
  });

  return (
    <div class="relative inline-block text-left">
      {/* Tombol Trigger (Titik Tiga) */}
      <button
        ref={buttonRef} // Pasang referensi di sini
        type="button"
        onClick={e => {toggleMenu(e); props.onClick?.(e);}} // Panggil toggleMenu dan props.onClick jika ada
        class="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-full transition outline-none focus:ring-2 focus:ring-blue-100"
        title="Opsi lainnya"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {/* AJAIBNYA DI SINI: Gunakan Portal untuk melempar menu ke luar tabel */}
      <Show when={isOpen()}>
        <Portal>
          {/* Overlay Transparan (Penuhi Layar) */}
          <div
            class="fixed inset-0 z-[9998]"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          ></div>

          {/* Kotak Menu Dropdown */}
          <div
            class="fixed bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] py-1.5 w-56"
            style={{ top: `${coords().top}px`, left: `${coords().left}px` }}
            onClick={(e) => {
              e.stopPropagation(); // 1. Hentikan klik agar tidak tembus ke baris tabel (tr)
              setIsOpen(false); // 2. Tutup menu!
            }}
          >
            {props.children}
          </div>
        </Portal>
      </Show>
    </div>
  );
}

// Komponen untuk masing-masing baris opsi
export function DropdownItem(props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        if (props.onClick) props.onClick(e);
      }}
      class={`w-full text-left px-4 py-2.5 text-[13px] font-medium flex items-center justify-between transition-colors ${
        props.danger
          ? "text-red-600 hover:bg-red-50"
          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <div class="flex items-center gap-3">
        <Show when={props.icon}>
          <span class={props.danger ? "text-red-500" : "text-gray-400"}>
            {props.icon}
          </span>
        </Show>
        <span>{props.label}</span>
      </div>
      <Show when={props.shortcut}>
        <span class="text-[11px] text-gray-400 font-normal tracking-wider">
          {props.shortcut}
        </span>
      </Show>
    </button>
  );
}

// Komponen untuk Garis Pemisah
export function DropdownDivider() {
  return <div class="h-px bg-gray-100 my-1.5 mx-2"></div>;
}

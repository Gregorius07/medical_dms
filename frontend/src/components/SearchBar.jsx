import { createSignal, Show } from "solid-js";

function SearchBar(props) {
  // State internal khusus untuk komponen pencarian
  const [searchQuery, setSearchQuery] = createSignal("");
  const [searchType, setSearchType] = createSignal("metadata");
  let searchTimeout;

  const handleSearch = (e) => {
    e.preventDefault();
    clearTimeout(searchTimeout);
    if (searchQuery().trim()) {
      props.onSearch(searchQuery(), searchType());
    }
  };

  const handleInputSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    clearTimeout(searchTimeout);

    if (!value.trim()) {
      handleClear();
      return;
    }

    searchTimeout = setTimeout(() => {
      props.onSearch(value, searchType());
    }, 500);
  };

  const handleTypeChange = (e) => {
    setSearchType(e.target.value);
    // Jika tipe diganti dan ada teks pencarian, langsung cari ulang dengan tipe baru
    if (searchQuery().trim()) {
      props.onSearch(searchQuery(), e.target.value);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    props.onClear();
  };

  return (
    <div class="bg-gray-50/80 border border-gray-200 rounded-xl p-3 mb-6 flex flex-col sm:flex-row gap-3 items-center">
      <form onSubmit={handleSearch} class="flex-1 flex w-full">
        {/* Dropdown Tipe Pencarian */}
        <select
          value={searchType()}
          onChange={handleTypeChange}
          class="bg-white border border-gray-200 text-gray-700 text-sm rounded-l-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 border-r-0 cursor-pointer transition-colors"
        >
          <option value="metadata">Metadata Search</option>
          <option value="fulltext">Full-Text Search (Elastic)</option>
        </select>

        {/* Input Keyword */}
        <div class="relative flex-1">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg class="w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery()}
            onInput={handleInputSearch}
            class="bg-white border border-gray-200 text-gray-900 text-sm rounded-r-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full pl-10 p-2.5 outline-none transition-colors"
            placeholder={props.placeholder || "Cari nama dokumen, pengunggah, atau metadata..."}
          />
        </div>
        <button type="submit" class="hidden">Search</button>
      </form>

      {/* Tombol Clear Search */}
      <Show when={props.isSearching}>
        <button
          onClick={handleClear}
          class="btn-danger-text whitespace-nowrap"
        >
          Batal Pencarian
        </button>
      </Show>
    </div>
  );
}

export default SearchBar;
import { createSignal, onMount } from "solid-js";
import { A, useNavigate, useLocation } from "@solidjs/router";
import { currentUser, setCurrentUser } from "../store/authStore";
import api from "../api";
function MainLayout(props) {
  const navigate = useNavigate();
  const location = useLocation();

  onMount(() => {
    if (!currentUser()) {
      navigate("/");
    }
  });

  const handleLogout = async () => {
    setCurrentUser(null);
    const response = await api.get("/logout");
    console.log(response.data);
    navigate("/");
  };

  // Helper untuk class aktif — dark sidebar style
  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
      isActive(path)
        ? "bg-sidebar-active text-sidebar-text-active border-l-[3px] border-primary-400 pl-[9px]"
        : "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active border-l-[3px] border-transparent pl-[9px]"
    }`;

  return (
    <div class="flex h-screen bg-gray-50">
      {/* SIDEBAR */}
      <div class="w-[260px] bg-sidebar flex flex-col shrink-0">
        {/* Logo */}
        <div class="px-5 py-5 border-b border-sidebar-border">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center shadow-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h2 class="text-base font-bold text-white tracking-tight">
                MedDocs
              </h2>
              <p class="text-[10px] text-sidebar-text tracking-wide">
                Document Management
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav class="flex-1 px-3 pt-4 space-y-1 overflow-y-auto">
          <Show when={currentUser()?.role != "admin"}>
            <A href="/draft" class={navLinkClass("/draft")}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-[18px] w-[18px] shrink-0 opacity-70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              My Documents
            </A>
          </Show>

          <Show when={currentUser()?.role !== "admin"}>
            <A href="/folders" class={navLinkClass("/folders")}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-[18px] w-[18px] shrink-0 opacity-70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              Shared Documents
            </A>
          </Show>
          <Show when={currentUser()?.role === "admin"}>
            <A href="/folders" class={navLinkClass("/folders")}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-[18px] w-[18px] shrink-0 opacity-70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              All Documents
            </A>
          </Show>

          <A href="/approvals" class={navLinkClass("/approvals")}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-[18px] w-[18px] shrink-0 opacity-70"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Approval
          </A>

          <Show when={currentUser()?.role === "admin"}>
            <div class="pt-5 pb-2 px-3">
              <p class="text-[10px] font-semibold text-sidebar-text/50 uppercase tracking-widest">
                Configuration
              </p>
            </div>
            <A href="/positions" class={navLinkClass("/positions")}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-[18px] w-[18px] shrink-0 opacity-70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                />
              </svg>
              Position
            </A>
            <A href="/departments" class={navLinkClass("/departments")}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-[18px] w-[18px] shrink-0 opacity-70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              Department
            </A>
            <A href="/users" class={navLinkClass("/users")}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-[18px] w-[18px] shrink-0 opacity-70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Users
            </A>
          </Show>
        </nav>

        {/* Sidebar Footer — User Profile */}
        <div class="px-3 py-4 border-t border-sidebar-border">
          <div class="flex items-center gap-3 px-2">
            <div class="w-8 h-8 rounded-full bg-primary-600/30 text-primary-300 flex items-center justify-center text-xs font-bold shrink-0">
              {currentUser()?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-sidebar-text-active truncate">
                {currentUser()?.name}
              </p>
              <p class="text-[10px] text-sidebar-text capitalize">
                {currentUser()?.role}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT WRAPPER */}
      <div class="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header class="bg-white px-6 py-4 flex justify-between items-center border-b border-gray-100 shrink-0">
          <h1 class="text-lg font-bold text-gray-800 capitalize">
            {location.pathname.replace("/", "") || "Folder"}
          </h1>
          <div class="flex items-center gap-3">
            <div class="text-right mr-1 hidden sm:block">
              <p class="text-sm font-semibold text-gray-800">
                {currentUser()?.name}
              </p>
              <p class="text-[11px] text-gray-400 capitalize">
                {currentUser()?.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              class="px-3.5 py-1.5 text-xs font-medium text-red-500 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 hover:border-red-200 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {/* DYNAMIC CONTENT */}
        <main class="flex-1 overflow-y-auto p-6">{props.children}</main>
      </div>
    </div>
  );
}

export default MainLayout;

import { createSignal, onMount, Show } from "solid-js";
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" id="MedicalRecord">
  <g fill="#000000" class="color000000 svgShape">
    <rect width="84.91" height="65.74" x="-2.91" y="19.64" fill="#6595f4" transform="rotate(90 39.545 52.505)" class="colorf48265 svgShape"></rect>
    <rect width="57.46" height="76.63" x="10.82" y="14.19" fill="#cedaf2" class="colorcecff2 svgShape"></rect>
    <path fill="#6595f4" d="M6.68,10.05V95H72.41V10.05ZM68.27,90.82H10.82V14.19H68.27Z" class="colorf48265 svgShape"></path>
    <polygon fill="#79a2f4" points="10.82 22.75 10.82 14.19 68.27 14.19 68.27 22.75 72.41 22.75 72.41 10.05 6.68 10.05 6.68 22.75 10.82 22.75" class="colorf4b479 svgShape"></polygon>
    <rect width="42.17" height="4.14" x="19.67" y="10.05" fill="#abc3f4" class="colorf4e1ab svgShape"></rect>
    <polygon fill="#568bf4" points="68.27 73.88 68.27 90.82 10.82 90.82 10.82 73.88 6.68 73.88 6.68 94.96 72.41 94.96 72.41 73.88 68.27 73.88" class="colorf45a56 svgShape"></polygon>
    <rect width="40" height="4.14" x="18.58" y="90.82" fill="#3c73db" class="colordb3c47 svgShape"></rect>
    <path fill="#f3f4f6" d="M63.27 42.65V22.93a3.74 3.74 0 00-3.75-3.74H19.57a3.74 3.74 0 00-3.75 3.74V42.65a3.84 3.84 0 003.84 3.84H59.43A3.84 3.84 0 0063.27 42.65zM15.82 58.38V82.07a3.74 3.74 0 003.75 3.75h40a3.74 3.74 0 003.75-3.75V58.38a3.84 3.84 0 00-3.84-3.85H19.66A3.84 3.84 0 0015.82 58.38z" class="colorf1f2f2 svgShape"></path>
    <path fill="#a4b4d4" d="M53.77,9.71v4.65a1.94,1.94,0,0,1-1.94,1.94H27.26a1.94,1.94,0,0,1-1.94-1.94V9.71a1.94,1.94,0,0,1,1.94-1.94h3.85A1.93,1.93,0,0,0,33,6.26a6.73,6.73,0,0,1,13.11,0A1.94,1.94,0,0,0,48,7.77h3.84A1.94,1.94,0,0,1,53.77,9.71Z" class="colora4abd4 svgShape"></path>
    <path fill="#d1d2d4" d="M53.77,9.71v.47a1.94,1.94,0,0,1-1.94,1.94H27.26a1.94,1.94,0,0,1-1.94-1.94V9.71a1.94,1.94,0,0,1,1.94-1.94h3.85A1.93,1.93,0,0,0,33,6.26a6.73,6.73,0,0,1,13.11,0A1.94,1.94,0,0,0,48,7.77h3.84A1.94,1.94,0,0,1,53.77,9.71Z" class="colord1d3d4 svgShape"></path>
    <path fill="#ffffff" d="M35.45,8.17A4.79,4.79,0,0,0,35.9,7a3.83,3.83,0,0,1,3.21-2.91,3.73,3.73,0,0,1,4.07,2.87,5.09,5.09,0,0,0,.45,1.24.65.65,0,0,1-.57.95H36A.65.65,0,0,1,35.45,8.17Z" class="colorffffff svgShape"></path>
    <polygon fill="#4c87f4" points="47.3 29.04 42.15 29.04 42.15 23.89 36.94 23.89 36.94 29.04 31.79 29.04 31.79 34.26 36.94 34.26 36.94 39.41 42.15 39.41 42.15 34.26 47.3 34.26 47.3 29.04" class="colorf4504c svgShape"></polygon>
    <rect width="5" height="5" x="57.02" y="47.26" fill="#84abea" rx="1.46" class="color84aeea svgShape"></rect>
    <rect width="5" height="5" x="57.02" y="57.41" fill="#84abea" rx="1.46" class="color84aeea svgShape"></rect>
    <rect width="5" height="5" x="57.02" y="67.56" fill="#84abea" rx="1.46" class="color84aeea svgShape"></rect>
    <rect width="5" height="5" x="57.02" y="77.71" fill="#84abea" rx="1.46" class="color84aeea svgShape"></rect>
    <rect width="6.06" height="31.79" x="79.3" y="46.64" fill="#3b82f6" transform="rotate(-180 82.33 62.53)" class="color5c86c7 svgShape"></rect>
    <rect width="6.06" height="10.77" x="79.3" y="46.64" fill="#436aa9" transform="rotate(-180 82.33 52.025)" class="color435ea9 svgShape"></rect>
    <rect width="7.41" height="17.34" x="78.63" y="35.21" fill="#5c77a4" transform="rotate(-180 82.33 43.88)" class="color5c63a4 svgShape"></rect>
    <rect width="2.91" height="17.34" x="83.13" y="35.21" fill="#405886" transform="rotate(-180 84.58 43.88)" class="color484086 svgShape"></rect>
    <rect width="1.79" height="11.84" x="81.44" y="37.96" fill="#7f98c2" rx=".89" transform="rotate(180 82.33 43.88)" class="color7f81c2 svgShape"></rect>
    <rect width="1.79" height="11.84" x="81.44" y="61.64" fill="#84a9e5" rx=".89" transform="rotate(-180 82.33 67.56)" class="color84aee5 svgShape"></rect>
    <path fill="#3b82f6" d="M79.46,29.48H85.2a0,0,0,0,1,0,0v3.73a2,2,0,0,1-2,2H81.46a2,2,0,0,1-2-2V29.48A0,0,0,0,1,79.46,29.48Z" transform="rotate(-180 82.33 32.345)" class="color5c86c7 svgShape"></path>
    <polygon fill="#5c77a4" points="82.33 86.95 79.3 78.42 85.36 78.42 82.33 86.95" class="color5c63a4 svgShape"></polygon>
    <path fill="#0f1e3a" d="M72.41,96H6.68a1,1,0,0,1-1-1V10.05a1,1,0,0,1,1-1H25.32a1,1,0,0,1,1,1v4.31a.94.94,0,0,0,.94.94H51.83a.94.94,0,0,0,.94-.94V10.05a1,1,0,0,1,1-1H72.41a1,1,0,0,1,1,1V95A1,1,0,0,1,72.41,96ZM7.68,94H71.41V11.05H54.77v3.31a2.94,2.94,0,0,1-2.94,2.94H27.26a2.94,2.94,0,0,1-2.94-2.94V11.05H7.68Z" class="color302d3d svgShape"></path>
    <path fill="#0f1e3a" d="M68.27,91.82H10.82a1,1,0,0,1-1-1V14.19a1,1,0,0,1,1-1h14.5a1,1,0,0,1,1,1v.17a.94.94,0,0,0,.94.94H51.83a.94.94,0,0,0,.94-.94v-.17a1,1,0,0,1,1-1h14.5a1,1,0,0,1,1,1V90.82A1,1,0,0,1,68.27,91.82Zm-56.45-2H67.27V15.19H54.65a3,3,0,0,1-2.82,2.11H27.26a3,3,0,0,1-2.82-2.11H11.82Z" class="color302d3d svgShape"></path>
    <path fill="#0f1e3a" d="M51.83 17.3H27.26a2.94 2.94 0 01-2.94-2.94V9.71a2.94 2.94 0 012.94-2.94h3.85A1 1 0 0032 6a7.72 7.72 0 0115 0 .94.94 0 00.92.74h3.84a2.94 2.94 0 012.94 2.94v4.65A2.94 2.94 0 0151.83 17.3zM27.26 8.77a.94.94 0 00-.94.94v4.65a.94.94 0 00.94.94H51.83a.94.94 0 00.94-.94V9.71a.94.94 0 00-.94-.94H48a2.93 2.93 0 01-2.87-2.29A5.73 5.73 0 0034 6.48a2.91 2.91 0 01-2.85 2.29zM42.15 40.41H36.94a1 1 0 01-1-1V35.26H31.79a1 1 0 01-1-1V29a1 1 0 011-1h4.15V23.89a1 1 0 011-1h5.21a1 1 0 011 1V28h4.16a1 1 0 011 1v5.22a1 1 0 01-1 1H43.15v4.15A1 1 0 0142.15 40.41zm-4.21-2h3.21V34.26a1 1 0 011-1h4.16V30H42.15a1 1 0 01-1-1V24.89H37.94V29a1 1 0 01-1 1H32.79v3.22h4.15a1 1 0 011 1zM60.56 53.26H58.48A2.46 2.46 0 0156 50.8V48.71a2.46 2.46 0 012.46-2.45h2.08A2.46 2.46 0 0163 48.71V50.8A2.46 2.46 0 0160.56 53.26zm-2.08-5a.46.46 0 00-.46.45V50.8a.47.47 0 00.46.46h2.08A.46.46 0 0061 50.8V48.71a.45.45 0 00-.46-.45zM60.56 63.41H58.48A2.46 2.46 0 0156 61V58.87a2.46 2.46 0 012.46-2.46h2.08A2.46 2.46 0 0163 58.87V61A2.46 2.46 0 0160.56 63.41zm-2.08-5a.46.46 0 00-.46.46V61a.47.47 0 00.46.46h2.08A.46.46 0 0061 61V58.87a.45.45 0 00-.46-.46zM60.56 73.56H58.48A2.46 2.46 0 0156 71.1V69a2.46 2.46 0 012.46-2.46h2.08A2.46 2.46 0 0163 69V71.1A2.46 2.46 0 0160.56 73.56zm-2.08-5A.47.47 0 0058 69V71.1a.46.46 0 00.46.46h2.08A.45.45 0 0061 71.1V69a.46.46 0 00-.46-.46zM60.56 83.72H58.48A2.46 2.46 0 0156 81.26V79.17a2.46 2.46 0 012.46-2.46h2.08A2.46 2.46 0 0163 79.17v2.09A2.46 2.46 0 0160.56 83.72zm-2.08-5a.47.47 0 00-.46.46v2.09a.47.47 0 00.46.46h2.08a.46.46 0 00.46-.46V79.17a.46.46 0 00-.46-.46zM51.72 50.76H23.66a1 1 0 010-2H51.72a1 1 0 010 2zM51.72 60.91H23.66a1 1 0 110-2H51.72a1 1 0 010 2zM51.72 71.06H23.66a1 1 0 110-2H51.72a1 1 0 010 2zM51.72 81.21H23.66a1 1 0 110-2H51.72a1 1 0 110 2zM18.75 50.76H17.07a1 1 0 010-2h1.68a1 1 0 010 2zM18.75 60.91H17.07a1 1 0 110-2h1.68a1 1 0 010 2zM18.75 71.06H17.07a1 1 0 110-2h1.68a1 1 0 010 2zM18.75 81.21H17.07a1 1 0 010-2h1.68a1 1 0 010 2zM85.36 79.42H79.3a1 1 0 01-1-1V52.55a1 1 0 011-1h6.06a1 1 0 011 1V78.42A1 1 0 0185.36 79.42zm-5.06-2h4.06V53.55H80.3z" class="color302d3d svgShape"></path>
    <path fill="#0f1e3a" d="M86,53.55H78.63a1,1,0,0,1-1-1V35.21a1,1,0,0,1,1-1H86a1,1,0,0,1,1,1V52.55A1,1,0,0,1,86,53.55Zm-6.41-2H85V36.21H79.63Z" class="color302d3d svgShape"></path>
    <path fill="#0f1e3a" d="M85.2,36.21H79.46a1,1,0,0,1-1-1V31.48a3,3,0,0,1,3-3H83.2a3,3,0,0,1,3,3v3.73A1,1,0,0,1,85.2,36.21Zm-4.74-2H84.2V31.48a1,1,0,0,0-1-1H81.46a1,1,0,0,0-1,1Z" class="color302d3d svgShape"></path>
    <path fill="#0f1e3a" d="M78.63 36.21h-2.1a1 1 0 010-2h2.1a1 1 0 010 2zM89.32 47.49a1 1 0 01-1-1V36.85a.64.64 0 00-.63-.64H86a1 1 0 010-2h1.65a2.64 2.64 0 012.63 2.64v9.64A1 1 0 0189.32 47.49zM81.39 87.29l-3-8.53a1 1 0 01.94-1.34h6.06a1 1 0 01.94 1.34l-3 8.53A1 1 0 0181.39 87.29zm-.67-7.87L82.33 84l1.61-4.55z" class="color302d3d svgShape"></path>
  </g>
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

          <A href="/recycle-bin" class={navLinkClass("/recycle-bin")}>
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
                d="M19 7L5 7m2 0l1 12a2 2 0 002 2h4a2 2 0 002-2l1-12M10 11v6m4-6v6M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2"
              />
            </svg>
            Recycle Bin
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

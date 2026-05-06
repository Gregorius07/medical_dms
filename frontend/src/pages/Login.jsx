import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import api from "../api";
import { setCurrentUser, setIsAuthLoading } from "../store/authStore";

function Login() {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);
  const navigate = useNavigate();
  // Pastikan createSignal sudah di-import dari "solid-js"
const [showPassword, setShowPassword] = createSignal(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await api.post("/login", {
        //kirim email password
        email: email(),
        password: password(),
      });

      if (response.data.user) {
        setIsAuthLoading(false);
        setCurrentUser(response.data.user);
        navigate("/folders");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal terhubung ke server";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class="min-h-screen w-full bg-gray-50 flex flex-col items-center pt-16 px-4">
      {/* HEADER ATAS */}
      <div class="flex flex-col items-center mb-10">
        <div class="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mb-4 shadow-lg">
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
        <h1 class="text-2xl font-bold text-gray-900 mb-1 tracking-tight">
          MedDocs
        </h1>
        <p class="text-sm text-gray-500 text-center max-w-md">
          Centralized medical document management with a controlled approval process.
        </p>
      </div>

      {/* CARD LOGIN */}
      <div class="w-full max-w-xl bg-white rounded-2xl shadow-card border border-gray-100 px-10 py-10">
        <h2 class="text-xl font-bold text-gray-900 mb-1.5">
          Log in to the system
        </h2>
        <p class="text-sm text-gray-500 mb-7">
          Use your hospital account to manage and access documents.
        </p>

        <form onSubmit={handleLogin} class="space-y-5">
          <div>
            <label class="input-label">
              Username
            </label>
            <input
              type="text"
              placeholder="Enter your username"
              class="input-field"
              value={email()}
              onInput={(e) => setEmail(e.target.value)}
              disabled={isLoading()}
            />
          </div>

          <div>
            <label class="input-label">
              Password
            </label>
            
            {/* Bungkus input dengan relative agar icon bisa diposisikan absolute di dalamnya */}
            <div class="relative">
              <input
                type={showPassword() ? "text" : "password"}
                placeholder="Enter your password"
                class="input-field pr-12"
                value={password()}
                onInput={(e) => setPassword(e.target.value)}
                disabled={isLoading()}
              />
              
              {/* Tombol Toggle Mata */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword())}
                class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
              >
                <Show
                  when={showPassword()}
                  fallback={
                    // Ikon Mata Tertutup (Hide)
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  }
                >
                  {/* Ikon Mata Terbuka (Show) */}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Show>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading()}
            class="w-full btn-primary py-3 rounded-full text-sm"
          >
            {isLoading() ? "Loading..." : "Login"}
          </button>

          {error() && (
            <div class="rounded-xl bg-red-50 border border-red-200 text-sm px-4 py-3 flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-400 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <div>
                <p class="font-semibold text-red-700 mb-0.5">Login gagal</p>
                <p class="text-red-600">{error()}</p>
              </div>
            </div>
          )}

          <p class="mt-4 text-xs text-center text-gray-400">
            Contact the administrator if you encounter access issues.
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;

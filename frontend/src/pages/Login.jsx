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
          <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

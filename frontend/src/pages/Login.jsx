import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import api from "../api";

function Login() {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);
  const navigate = useNavigate();

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

      if (response.data.success) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
        localStorage.setItem("token", response.data.token);
        navigate("/dashboard");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal terhubung ke server";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class="min-h-screen w-full bg-[#F4F6FB] flex flex-col items-center pt-16 px-4">
      {/* HEADER ATAS */}
      <div class="flex flex-col items-center mb-10">
        <div class="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center mb-4">
          <span class="w-7 h-7 rounded-full bg-white inline-block" />
        </div>
        <h1 class="text-2xl font-semibold text-[#111827] mb-1">
          MedDocs
        </h1>
        <p class="text-sm text-[#6B7280] text-center max-w-md">
          Centralized medical document management with a controlled approval process.
        </p>
      </div>

      {/* CARD LOGIN */}
      <div class="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-[#E5E7EB] px-10 py-10">
        <h2 class="text-xl font-semibold text-[#111827] mb-2">
          Log in to the system
        </h2>
        <p class="text-sm text-[#6B7280] mb-7">
          Use your hospital account to manage and access documents.
        </p>

        <form onSubmit={handleLogin} class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-[#374151] mb-2">
              Username
            </label>
            <input
              type="text"
              placeholder="Enter your username"
              class="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-sm text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              value={email()}
              onInput={(e) => setEmail(e.target.value)}
              disabled={isLoading()}
            />
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-[#374151]">
                Password
              </label>
            </div>
            <input
              type="password"
              placeholder="Enter your username"
              class="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-sm text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              value={password()}
              onInput={(e) => setPassword(e.target.value)}
              disabled={isLoading()}
            />
            <div class="mt-3 flex items-center justify-between text-sm">
              <label class="inline-flex items-center gap-2 text-[#4B5563]">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                  disabled={isLoading()}
                />
                <span>Remember Me</span>
              </label>
              <button
                type="button"
                class="text-[#2563EB] hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading()}
            class="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-3 rounded-full text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading() ? "Loading..." : "Login"}
          </button>

          {error() && (
            <div class="mt-3 rounded-lg bg-[#EF4444] text-white text-sm px-4 py-3">
              <p class="font-semibold mb-1">Login gagal</p>
              <p>{error()}</p>
            </div>
          )}

          <p class="mt-4 text-xs text-center text-[#6B7280]">
            Contact the administrator if you encounter access issues.
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;

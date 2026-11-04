import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, HeartPulse, LoaderCircle, ShieldCheck } from "lucide-react";
import { apiRequest, clearSession, saveSession } from "../lib/api";

function LoginPage({ staffMode = false }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (staffMode && mode !== "login") {
        throw new Error("Staff accounts cannot be created through public registration.");
      }

      const payload = mode === "register"
        ? await apiRequest("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ name, email, password }),
          })
        : await apiRequest("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password, portal: staffMode ? "staff" : "patient" }),
          });

      const allowedRoles = staffMode ? ["DOCTOR", "ADMIN"] : ["PATIENT"];
      if (!allowedRoles.includes(payload.user?.role)) {
        // Do not leave a previous session in place after a portal mismatch.
        clearSession();
        throw new Error(staffMode
          ? "This account is not authorized for staff access. Use an approved doctor or administrator account."
          : "This is a staff account. Please use Staff Login.");
      }

      if (!payload.token || !payload.user) {
        throw new Error("The server returned an incomplete login response. Please try again.");
      }

      saveSession(payload);
      const destination = staffMode ? "/doctor" : (location.state?.from || "/patient");
      navigate(destination, { replace: true });
    } catch (requestError) {
      if (requestError.status === 403) clearSession();
      setError(requestError.message || "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 sm:px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700">
          <ArrowLeft size={17} /> Back to home
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white"><HeartPulse size={25} /></div>
            <div><p className="text-sm font-semibold text-blue-700">Janta Hospital</p><p className="text-xs text-slate-500">Jahangirabad</p></div>
          </div>

          <h1 className="mt-7 text-2xl font-bold text-slate-900">
            {staffMode ? "Staff sign in" : mode === "login" ? "Patient sign in" : "Create a patient account"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {staffMode
              ? "Authorized doctors and administrators only. Staff accounts are provisioned by the hospital."
              : mode === "login"
                ? "Sign in to request a token and view your own queue status."
                : "Create a patient account to request a token and view your own queue status."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {!staffMode && mode === "register" && <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-slate-700">Full name</label>
              <input id="name" autoComplete="name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
              <input id="email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
              <input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              {!staffMode && mode === "register" && <p className="mt-1.5 text-xs text-slate-500">Use 8 or more characters.</p>}
            </div>

            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
              {busy && <LoaderCircle className="animate-spin" size={18} />}
              {busy ? "Please wait…" : staffMode ? "Open staff dashboard" : mode === "login" ? "Sign in to patient portal" : "Create patient account"}
            </button>
          </form>

          {!staffMode && <div className="mt-5 text-center text-sm text-slate-600">
            {mode === "login" ? "New patient? " : "Already registered? "}
            <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="font-semibold text-blue-700 hover:text-blue-800">
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>}

          <div className="mt-6 flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            <ShieldCheck className="mt-0.5 shrink-0 text-slate-500" size={18} />
            <p>{staffMode
              ? "Patient accounts cannot access staff controls. Role permissions are also checked by the backend."
              : "Public registration creates patient accounts only. Staff access is limited to accounts provisioned by the hospital."}</p>
          </div>
          <div className="mt-4 text-center text-sm">
            <Link to={staffMode ? "/login" : "/staff-login"} className="font-semibold text-blue-700 hover:text-blue-800">
              {staffMode ? "Go to Patient Login" : "Hospital Staff? Staff Login"}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;

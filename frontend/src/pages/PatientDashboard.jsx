import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Clock3, HeartPulse, Home, LogOut, Users, UserRound, RefreshCw } from "lucide-react";
import { apiRequest, clearSession, getStoredUser } from "../lib/api";

function displayDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function PatientDashboard() {
  const [queue, setQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const user = getStoredUser();

  const refresh = useCallback(async (background = false) => {
    if (!background) setRefreshing(true);
    try {
      const [queueData, appointmentData] = await Promise.all([
        apiRequest("/api/queue"),
        apiRequest("/api/appointments"),
      ]);
      setQueue(Array.isArray(queueData) ? queueData : []);
      setAppointments(Array.isArray(appointmentData) ? appointmentData : []);
      setError("");
    } catch (requestError) {
      if (requestError.status === 401) {
        clearSession();
        navigate("/login", { replace: true });
        return;
      }
      setError(requestError.message || "Could not load your hospital records.");
    } finally {
      setLoading(false);
      if (!background) setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [queueData, appointmentData] = await Promise.all([
          apiRequest("/api/queue"),
          apiRequest("/api/appointments"),
        ]);
        if (active) {
          setQueue(Array.isArray(queueData) ? queueData : []);
          setAppointments(Array.isArray(appointmentData) ? appointmentData : []);
          setError("");
        }
      } catch (requestError) {
        if (active && requestError.status === 401) {
          clearSession();
          navigate("/login", { replace: true });
        } else if (active) {
          setError(requestError.message || "Could not load your hospital records.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    const timer = setInterval(loadData, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [navigate]);

  const latestQueue = [...queue].sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))[0];
  const waitingCount = queue.filter((item) => item.status === "WAITING").length;
  const activeAppointments = appointments.filter((item) => !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(item.status));

  function logout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 border-r border-slate-200 bg-white md:block">
        <div className="flex items-center gap-3 border-b border-slate-200 p-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><HeartPulse size={22} /></div><div><h1 className="font-bold">Janta Hospital</h1><p className="text-xs text-slate-500">Jahangirabad</p></div></div>
        <nav className="space-y-2 p-4">
          <Link to="/patient" className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700"><Home size={18} /> Dashboard</Link>
          <Link to="/patient/book-appointment" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-600 hover:bg-slate-50"><CalendarDays size={18} /> Request token</Link>
          <Link to="/patient/queue" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-600 hover:bg-slate-50"><Users size={18} /> My queue</Link>
        </nav>
        <button onClick={logout} className="m-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-slate-600 hover:bg-slate-50"><LogOut size={18} /> Sign out</button>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div><p className="text-sm text-slate-500">Patient portal</p><h2 className="text-xl font-bold sm:text-2xl">Welcome{user?.name ? `, ${user.name}` : ""}</h2></div>
          <div className="flex items-center gap-2"><button type="button" onClick={() => refresh()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /><span className="hidden sm:inline">Refresh</span></button><button onClick={logout} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden" aria-label="Sign out"><LogOut size={20} /></button><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700"><UserRound size={20} /></div></div>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {loading && <p className="text-sm text-slate-500">Loading your appointments and queue…</p>}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">My latest token</p><Clock3 className="text-blue-600" size={21} /></div><p className="mt-3 break-words text-3xl font-bold text-slate-900">{latestQueue?.tokenNumber || "—"}</p><p className="mt-1 text-sm text-slate-500">{latestQueue?.status || "No token request yet"}</p></article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">Waiting tokens</p><Users className="text-blue-600" size={21} /></div><p className="mt-3 text-3xl font-bold text-slate-900">{waitingCount}</p><p className="mt-1 text-sm text-slate-500">Your own waiting requests</p></article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">Active appointments</p><CalendarDays className="text-blue-600" size={21} /></div><p className="mt-3 text-3xl font-bold text-slate-900">{activeAppointments.length}</p><p className="mt-1 text-sm text-slate-500">Saved in your account</p></article>
          </section>

          <section className="rounded-2xl bg-blue-700 p-6 text-white sm:p-8">
            <p className="text-sm font-semibold text-blue-100">Janta Hospital · Jahangirabad</p><h3 className="mt-2 text-2xl font-bold sm:text-3xl">Manage your visit</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Create a token request or review your saved queue status. The app does not estimate waiting time until real service-time information is configured.</p><Link to="/patient/book-appointment" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50">Request a token <CalendarDays size={18} /></Link>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">My latest queue request</h3><p className="mt-1 text-sm text-slate-500">Only records belonging to your account appear here.</p></div>{latestQueue && <Link to={`/patient/queue?tokenId=${latestQueue.id}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">View status</Link>}</div>
            {latestQueue ? <div className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><div><p className="text-xs uppercase tracking-wide text-slate-500">Token</p><p className="mt-1 text-2xl font-bold text-blue-700">{latestQueue.tokenNumber}</p><p className="mt-1 text-sm text-slate-600">{latestQueue.appointment?.doctor?.user?.name || "Doctor/service not available"}</p><p className="text-sm text-slate-500">{latestQueue.appointment?.doctor?.department?.name || "Service"}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Status</p><p className="mt-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">{latestQueue.status}</p><p className="mt-2 text-sm text-slate-500">Requested date: {displayDate(latestQueue.appointment?.appointmentDate)}</p></div></div> : !loading && <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">You have no token requests yet. Start by selecting a doctor or service.</div>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h3 className="text-lg font-bold">My appointments</h3><div className="mt-4 divide-y divide-slate-100">{appointments.slice(0, 5).map((appointment) => <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"><div><p className="font-semibold text-slate-900">{appointment.doctor?.user?.name || "Doctor/service"}</p><p className="mt-1 text-sm text-slate-500">{appointment.doctor?.department?.name || "Service"} · {displayDate(appointment.appointmentDate)} · {appointment.slot === "MORNING" ? "Morning · 9 AM–12 PM" : appointment.slot === "AFTERNOON" ? "Afternoon · 2–5 PM" : appointment.appointmentTime}</p><p className="mt-1 text-xs text-slate-500">{appointment.bookingType === "EMERGENCY" ? `Emergency · Review: ${appointment.emergencyStatus} · Surcharge ₹${appointment.surchargeAmount ?? 500} (not paid)` : "Normal booking"}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{appointment.queue?.status || appointment.status}</span></div>)}{!appointments.length && !loading && <p className="py-4 text-sm text-slate-500">No appointment records yet.</p>}</div></section>
        </div>
      </main>
    </div>
  );
}

export default PatientDashboard;

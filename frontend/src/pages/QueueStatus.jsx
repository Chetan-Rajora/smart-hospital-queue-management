import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock3, HeartPulse, RefreshCw, Users } from "lucide-react";
import { apiRequest, clearSession } from "../lib/api";

const statusClasses = {
  WAITING: "bg-amber-50 text-amber-800",
  SERVING: "bg-blue-50 text-blue-800",
  COMPLETED: "bg-green-50 text-green-800",
  SKIPPED: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-slate-100 text-slate-700",
};

function QueueStatus() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenId = searchParams.get("tokenId");

  const refresh = useCallback(async (background = false) => {
    if (!background) setRefreshing(true);
    try {
      const data = await apiRequest("/api/queue");
      setItems(Array.isArray(data) ? data : []);
      setUpdatedAt(new Date());
      setError("");
    } catch (requestError) {
      if (requestError.status === 401) {
        clearSession();
        navigate("/login", { replace: true });
        return;
      }
      setError(requestError.message || "Could not load queue status.");
    } finally {
      setLoading(false);
      if (!background) setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const data = await apiRequest("/api/queue");
        if (active) {
          setItems(Array.isArray(data) ? data : []);
          setUpdatedAt(new Date());
          setError("");
        }
      } catch (requestError) {
        if (active && requestError.status === 401) {
          clearSession();
          navigate("/login", { replace: true });
        } else if (active) {
          setError(requestError.message || "Could not load queue status.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    const timer = setInterval(loadData, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [navigate]);

  const latestItem = useMemo(() => [...items].sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))[0], [items]);
  const selectedItem = items.find((item) => String(item.id) === tokenId) || latestItem;
  const appointment = selectedItem?.appointment;
  const status = selectedItem?.status;
  const statusClass = statusClasses[status] || "bg-slate-100 text-slate-700";
  const peopleAhead = Number.isInteger(selectedItem?.peopleAhead) ? selectedItem.peopleAhead : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3 sm:gap-4"><Link to="/patient" aria-label="Back to dashboard" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ArrowLeft size={20} /></Link><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><HeartPulse size={22} /></span><div><h1 className="font-bold text-slate-900">Janta Hospital</h1><p className="text-xs text-slate-500">Jahangirabad · My queue</p></div></div>
          <button type="button" onClick={() => refresh()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /><span className="hidden sm:inline">Refresh</span></button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Personal queue</p><h2 className="mt-2 text-3xl font-bold text-slate-900">Your token status</h2><p className="mt-2 text-sm leading-6 text-slate-600">Queue details refresh automatically about every 10 seconds. Only your own token details are shown.</p></div>

        {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {loading && <p className="mt-6 text-sm text-slate-500">Loading your token status…</p>}

        {!loading && !selectedItem && !error && <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><h3 className="text-xl font-bold">No token requests yet</h3><p className="mt-2 text-sm leading-6 text-slate-600">Once you create a token request, its status and queue position will appear here.</p><Link to="/patient/book-appointment" className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">Request a token</Link></section>}

        {selectedItem && <>
          <div className="mt-7 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm text-slate-500">Doctor or service</p><h3 className="mt-1 text-xl font-bold text-slate-900">{appointment?.doctor?.user?.name || "Provider"}</h3><p className="mt-1 text-sm text-slate-500">{appointment?.doctor?.department?.name || "Service"}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusClass}`}>{status || "UNKNOWN"}</span></div>
              <div className="mt-7 rounded-3xl bg-blue-700 p-6 text-center text-white sm:p-8"><p className="text-sm font-semibold text-blue-100">YOUR TOKEN</p><p className="mt-2 break-words text-5xl font-bold tracking-tight sm:text-6xl">{selectedItem.tokenNumber}</p><p className="mt-3 text-sm text-blue-100">{status === "SERVING" ? "Your token is being served." : status === "COMPLETED" ? "This visit is marked complete." : status === "SKIPPED" ? "This token was skipped. Please contact hospital staff." : status === "CANCELLED" ? "This token is cancelled." : "Please follow any instructions from hospital staff."}</p></div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Booking date</p><p className="mt-1 font-semibold text-slate-900">{appointment?.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : "Not set"}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Time slot</p><p className="mt-1 font-semibold text-slate-900">{appointment?.slot === "MORNING" ? "Morning · 9:00 AM–12:00 PM" : appointment?.slot === "AFTERNOON" ? "Afternoon · 2:00 PM–5:00 PM" : appointment?.appointmentTime || "Not set"}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Booking type</p><p className="mt-1 font-semibold text-slate-900">{appointment?.bookingType === "EMERGENCY" ? "Emergency" : "Normal"}</p></div></div>
              {appointment?.bookingType === "EMERGENCY" && <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${appointment.emergencyStatus === "PENDING" ? "border-amber-200 bg-amber-50 text-amber-900" : appointment.emergencyStatus === "APPROVED" ? "border-green-200 bg-green-50 text-green-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}><p className="font-bold">Emergency review: {appointment.emergencyStatus || "PENDING"}</p><p className="mt-1">Surcharge: ₹{appointment.surchargeAmount ?? 500} (not recorded as paid).</p>{appointment.emergencyStatus === "PENDING" && <p className="mt-1">The request awaits authorized staff review. For a serious or life-threatening emergency, seek immediate in-person care; do not wait for app approval.</p>}{appointment.emergencyStatus === "APPROVED" && <p className="mt-1">Approved for priority assessment. This does not guarantee immediate treatment.</p>}{appointment.emergencyStatus === "DECLINED" && <p className="mt-1">Please contact hospital staff for next steps.</p>}</div>}
              {items.length > 1 && <div className="mt-6"><label htmlFor="choose-token" className="mb-2 block text-sm font-semibold text-slate-700">View another token</label><select id="choose-token" value={String(selectedItem.id)} onChange={(event) => navigate(`/patient/queue?tokenId=${event.target.value}`)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"><option value="">Latest token</option>{items.map((item) => <option key={item.id} value={item.id}>{item.tokenNumber} · {item.status}</option>)}</select></div>}
            </section>

            <section className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Users size={24} /></span><div><p className="text-sm text-slate-500">People ahead in this service queue</p><p className="mt-1 text-3xl font-bold text-slate-900">{status === "WAITING" && peopleAhead !== null ? peopleAhead : status === "SERVING" ? 0 : "—"}</p></div></div><p className="mt-3 text-xs leading-5 text-slate-500">Calculated from earlier waiting/serving tokens for the same doctor/service. Other patients' names are not shown.</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Clock3 size={24} /></span><div><p className="text-sm text-slate-500">Estimated waiting time</p><p className="mt-1 text-xl font-bold text-slate-900">Not configured</p></div></div><p className="mt-3 text-xs leading-5 text-slate-500">A reliable estimate needs actual service-time data. No fixed minutes-per-patient assumption is used.</p></div>
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-green-700" size={22} /><div><p className="font-bold text-green-900">Queue information is saved</p><p className="mt-1 text-sm leading-6 text-green-800">Staff queue actions update the database. This page displays the latest returned state, not a guarantee of a specific consultation time.</p>{updatedAt && <p className="mt-2 text-xs text-green-800">Last refreshed: {updatedAt.toLocaleTimeString()}</p>}</div></div></div>
            </section>
          </div>
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h3 className="text-lg font-bold text-slate-900">Your token history</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[...items].sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt)).map((item) => <button key={item.id} type="button" onClick={() => navigate(`/patient/queue?tokenId=${item.id}`)} className={`rounded-xl border p-4 text-left transition hover:border-blue-300 ${String(item.id) === String(selectedItem.id) ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}><p className="font-bold text-slate-900">{item.tokenNumber}</p><p className="mt-1 text-sm text-slate-500">{item.appointment?.doctor?.user?.name || "Doctor/service"}</p><span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[item.status] || "bg-slate-100 text-slate-700"}`}>{item.status}</span></button>)}</div></section>
        </>}
      </main>
    </div>
  );
}

export default QueueStatus;

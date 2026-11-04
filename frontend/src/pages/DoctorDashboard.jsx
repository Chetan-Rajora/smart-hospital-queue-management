import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Clock3, HeartPulse, Home, LogOut, Menu, RefreshCw, Users, CheckCircle2, XCircle, Bell } from "lucide-react";
import { apiRequest, clearSession, getStoredUser } from "../lib/api";

function hospitalDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function storedDateKey(value) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function DoctorDashboard() {
  const [queue, setQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [hospital, setHospital] = useState(null);
  const [directory, setDirectory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState(hospitalDateString());
  const [slotFilter, setSlotFilter] = useState("MORNING");
  const [bookingTypeFilter, setBookingTypeFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [emergencyBusyId, setEmergencyBusyId] = useState(null);
  const [notificationBusyId, setNotificationBusyId] = useState(null);
  const [error, setError] = useState("");
  const user = getStoredUser();
  const navigate = useNavigate();

  const refresh = useCallback(async (background = false) => {
    if (!background) setRefreshing(true);
    try {
      const [queueData, appointmentData, hospitalData, doctorData, notificationData] = await Promise.all([
        apiRequest("/api/queue"),
        apiRequest("/api/appointments"),
        apiRequest("/api/hospital"),
        apiRequest("/api/doctors"),
        apiRequest("/api/notifications"),
      ]);
      setQueue(Array.isArray(queueData) ? queueData : []);
      setAppointments(Array.isArray(appointmentData) ? appointmentData : []);
      setHospital(hospitalData);
      const configuredSlots = hospitalData?.booking?.slots || [];
      setSlotFilter((current) => current === "ALL" || configuredSlots.some((slot) => slot.value === current)
        ? current
        : (configuredSlots[0]?.value || "ALL"));
      setDirectory(Array.isArray(doctorData) ? doctorData : []);
      setNotifications(Array.isArray(notificationData) ? notificationData : []);
      setError("");
    } catch (requestError) {
      if (requestError.status === 401) {
        clearSession();
        navigate("/staff-login", { replace: true });
        return;
      }
      setError(requestError.message || "Could not load the hospital queue.");
    } finally {
      setLoading(false);
      if (!background) setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [queueData, appointmentData, hospitalData, doctorData, notificationData] = await Promise.all([
          apiRequest("/api/queue"),
          apiRequest("/api/appointments"),
          apiRequest("/api/hospital"),
          apiRequest("/api/doctors"),
          apiRequest("/api/notifications"),
        ]);
        if (active) {
          setQueue(Array.isArray(queueData) ? queueData : []);
          setAppointments(Array.isArray(appointmentData) ? appointmentData : []);
          setHospital(hospitalData);
          const configuredSlots = hospitalData?.booking?.slots || [];
          setSlotFilter((current) => current === "ALL" || configuredSlots.some((slot) => slot.value === current)
            ? current
            : (configuredSlots[0]?.value || "ALL"));
          setDirectory(Array.isArray(doctorData) ? doctorData : []);
          setNotifications(Array.isArray(notificationData) ? notificationData : []);
          setError("");
        }
      } catch (requestError) {
        if (active && requestError.status === 401) {
          clearSession();
          navigate("/staff-login", { replace: true });
        } else if (active) {
          setError(requestError.message || "Could not load the hospital queue.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    const timer = setInterval(loadData, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [navigate]);

  const providers = useMemo(() => {
    const map = new Map(directory.map((provider) => [String(provider.id), provider]));
    for (const item of [...queue, ...appointments]) {
      const provider = item.appointment?.doctor || item.doctor;
      if (provider?.id) map.set(String(provider.id), provider);
    }
    return [...map.values()].sort((a, b) => (a.user?.name || "").localeCompare(b.user?.name || ""));
  }, [directory, queue, appointments]);

  const providerQueue = providerFilter === "ALL"
    ? queue
    : queue.filter((item) => String(item.appointment?.doctor?.id) === providerFilter);
  const providerAppointments = providerFilter === "ALL"
    ? appointments
    : appointments.filter((item) => String(item.doctor?.id) === providerFilter);
  const queueMatchesFilters = (item) =>
    storedDateKey(item.appointment?.appointmentDate) === selectedDate &&
    (slotFilter === "ALL" || item.appointment?.slot === slotFilter) &&
    (bookingTypeFilter === "ALL" || item.appointment?.bookingType === bookingTypeFilter);
  const appointmentMatchesFilters = (item) =>
    storedDateKey(item.appointmentDate) === selectedDate &&
    (slotFilter === "ALL" || item.slot === slotFilter) &&
    (bookingTypeFilter === "ALL" || item.bookingType === bookingTypeFilter);

  const filteredQueue = providerQueue.filter(queueMatchesFilters).sort((a, b) => {
    const aRank = a.priority === "EMERGENCY" && a.appointment?.emergencyStatus === "APPROVED" ? 0 : 1;
    const bRank = b.priority === "EMERGENCY" && b.appointment?.emergencyStatus === "APPROVED" ? 0 : 1;
    return aRank - bRank || new Date(a.joinedAt) - new Date(b.joinedAt) || a.id - b.id;
  });
  const filteredAppointments = providerAppointments.filter(appointmentMatchesFilters);
  const waitingAll = filteredQueue.filter((item) => item.status === "WAITING");
  const pendingEmergencyAppointments = filteredAppointments.filter((item) => item.bookingType === "EMERGENCY" && item.emergencyStatus === "PENDING");
  const waiting = waitingAll.filter((item) => !(item.appointment?.bookingType === "EMERGENCY" && item.appointment?.emergencyStatus === "PENDING"));
  const serving = filteredQueue.filter((item) => item.status === "SERVING");
  const completed = filteredQueue.filter((item) => item.status === "COMPLETED");
  const allProvidersView = user?.role === "ADMIN" && providerFilter === "ALL";
  const queueActionScopeReady = slotFilter !== "ALL" && !allProvidersView;
  const actionQueue = providerQueue.filter((item) =>
    storedDateKey(item.appointment?.appointmentDate) === selectedDate &&
    item.appointment?.slot === slotFilter
  );
  const current = queueActionScopeReady ? actionQueue.find((item) => item.status === "SERVING") || null : null;
  const next = queueActionScopeReady ? actionQueue.filter((item) => item.status === "WAITING" &&
    !(item.appointment?.bookingType === "EMERGENCY" && item.appointment?.emergencyStatus === "PENDING")
  ).sort((a, b) => {
    const aRank = a.priority === "EMERGENCY" && a.appointment?.emergencyStatus === "APPROVED" ? 0 : 1;
    const bRank = b.priority === "EMERGENCY" && b.appointment?.emergencyStatus === "APPROVED" ? 0 : 1;
    return aRank - bRank || new Date(a.joinedAt) - new Date(b.joinedAt) || a.id - b.id;
  })[0] || null : null;
  const currentlyServingValue = allProvidersView ? serving.length : (queueActionScopeReady ? (current?.tokenNumber || "—") : "Select slot");
  const selectedDateAppointments = filteredAppointments.length;
  const providerLabel = providerFilter === "ALL"
    ? (user?.role === "ADMIN" ? "All doctors and services" : (queue[0]?.appointment?.doctor?.user?.name || appointments[0]?.doctor?.user?.name || "Assigned service"))
    : (providers.find((provider) => String(provider.id) === providerFilter)?.user?.name || "Selected service");

  async function act(item, action) {
    if (!item || busyId) return;
    setBusyId(item.id);
    setError("");
    try {
      await apiRequest(`/api/queue/${item.id}/action`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await refresh(true);
    } catch (requestError) {
      if (requestError.status === 401) {
        clearSession();
        navigate("/staff-login", { replace: true });
        return;
      }
      setError(requestError.message || "Queue action failed.");
      await refresh(true);
    } finally {
      setBusyId(null);
    }
  }

  async function decideEmergency(appointment, decision) {
    if (!appointment || emergencyBusyId) return;
    setEmergencyBusyId(appointment.id);
    setError("");
    try {
      await apiRequest(`/api/appointments/${appointment.id}/emergency-decision`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      await refresh(true);
    } catch (requestError) {
      if (requestError.status === 401) {
        clearSession();
        navigate("/staff-login", { replace: true });
        return;
      }
      setError(requestError.message || "Could not process emergency request.");
      await refresh(true);
    } finally {
      setEmergencyBusyId(null);
    }
  }

  async function markNotificationRead(notification) {
    if (!notification || notificationBusyId) return;
    setNotificationBusyId(notification.id);
    try {
      await apiRequest(`/api/notifications/${notification.id}/read`, { method: "PATCH" });
      await refresh(true);
    } catch (requestError) {
      setError(requestError.message || "Could not update notification.");
    } finally {
      setNotificationBusyId(null);
    }
  }

  function logout() {
    clearSession();
    navigate("/staff-login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 border-r border-slate-200 bg-white md:block">
        <div className="flex items-center gap-3 border-b border-slate-200 p-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><HeartPulse size={22} /></div><div><h1 className="font-bold text-slate-900">Janta Hospital</h1><p className="text-xs text-slate-500">Jahangirabad</p></div></div>
        <nav className="space-y-2 p-4"><div className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700"><Home size={18} /> Staff dashboard</div><a href="#queue" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-600 hover:bg-slate-50"><Users size={18} /> Queue</a><a href="#appointments" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-600 hover:bg-slate-50"><CalendarDays size={18} /> Appointments</a></nav>
        <button onClick={logout} className="m-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-slate-600 hover:bg-slate-50"><LogOut size={18} /> Sign out</button>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3"><Menu className="text-slate-500 md:hidden" size={21} /><div><p className="text-sm text-slate-500">Hospital staff portal</p><h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Queue dashboard</h2></div></div>
          <div className="flex items-center gap-2"><button onClick={() => refresh()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /><span className="hidden sm:inline">Refresh</span></button><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{user?.name?.split(/\s+/).map((part) => part[0]).join("").slice(0, 2) || "ST"}</div><button onClick={logout} aria-label="Sign out" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><LogOut size={19} /></button></div>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {loading && <p className="text-sm text-slate-500">Loading current queue records…</p>}
          {user?.role === "ADMIN" && <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><label htmlFor="providerFilter" className="mb-2 block text-sm font-semibold text-slate-700">View queue for doctor/service</label><select id="providerFilter" value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 sm:max-w-xl"><option value="ALL">All doctors and services</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.user?.name || "Provider"} — {provider.department?.name || "Service"}</option>)}</select></section>}

          <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
            <div><label htmlFor="queueDate" className="mb-2 block text-sm font-semibold text-slate-700">Booking date</label><div className="flex gap-2"><input id="queueDate" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5" /><button type="button" onClick={() => setSelectedDate(hospitalDateString())} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">Today</button></div></div>
            <div><label htmlFor="slotFilter" className="mb-2 block text-sm font-semibold text-slate-700">Time slot</label><select id="slotFilter" value={slotFilter} onChange={(event) => setSlotFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="ALL">All slots</option><option value="MORNING">Morning · 9 AM–12 PM</option><option value="AFTERNOON">Afternoon · 2 PM–5 PM</option></select></div>
            <div><label htmlFor="bookingTypeFilter" className="mb-2 block text-sm font-semibold text-slate-700">Booking type</label><select id="bookingTypeFilter" value={bookingTypeFilter} onChange={(event) => setBookingTypeFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="ALL">Normal and emergency</option><option value="NORMAL">Normal only</option><option value="EMERGENCY">Emergency only</option></select></div>
            <div className="flex flex-col justify-end"><p className="text-sm font-semibold text-slate-700">{filteredQueue.length} token(s) in this view</p><p className="mt-1 text-xs text-slate-500">Queue data refreshes every five seconds.</p></div>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
            <div className="flex items-start gap-3"><Bell className="mt-1 shrink-0 text-amber-800" size={21} /><div className="min-w-0 flex-1"><h3 className="text-lg font-bold text-amber-950">Emergency requests needing review</h3><p className="mt-1 text-sm leading-6 text-amber-900">Requests remain pending until an authorized staff member approves or declines them. The displayed ₹500 surcharge is not recorded as paid.</p>
              {pendingEmergencyAppointments.length ? <div className="mt-4 space-y-3">{pendingEmergencyAppointments.map((item) => <article key={item.id} className="rounded-xl border border-amber-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{item.queue?.tokenNumber || `Appointment ${item.id}`} · {item.patient?.name || "Patient"}</p><p className="mt-1 text-sm text-slate-600">{item.doctor?.user?.name || "Doctor/service"} · {item.slot === "MORNING" ? "Morning · 9 AM–12 PM" : "Afternoon · 2–5 PM"}</p><p className="mt-1 text-xs text-slate-500">{storedDateKey(item.appointmentDate)} · Emergency surcharge ₹{item.surchargeAmount ?? 500} · Review pending</p></div><div className="flex gap-2"><button type="button" disabled={Boolean(emergencyBusyId)} onClick={() => decideEmergency(item, "approve")} className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 size={15} /> {emergencyBusyId === item.id ? "Saving…" : "Approve"}</button><button type="button" disabled={Boolean(emergencyBusyId)} onClick={() => decideEmergency(item, "decline")} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><XCircle size={15} /> Decline</button></div></div></article>)}</div> : <p className="mt-3 rounded-xl bg-white/80 p-3 text-sm text-slate-600">No pending emergency requests match the selected date, provider, slot, and booking type.</p>}
            </div></div>
          </section>

          {notifications.some((item) => !item.isRead) && <section className="rounded-2xl border border-blue-200 bg-white p-4 sm:p-5"><h3 className="font-bold text-slate-900">Staff notifications</h3><div className="mt-3 space-y-2">{notifications.filter((item) => !item.isRead).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-50 p-3"><div className="flex-1"><p className="text-sm text-slate-800">{item.message}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p></div><button type="button" disabled={Boolean(notificationBusyId)} onClick={() => markNotificationRead(item)} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-50">{notificationBusyId === item.id ? "Saving…" : "Mark read"}</button></div>)}</div></section>}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[["Waiting patients", waiting.length, Users], [allProvidersView ? "Patients being served" : "Currently serving", currentlyServingValue, Clock3], ["Appointments on selected date", selectedDateAppointments, CalendarDays], ["Completed visits", completed.length, HeartPulse]].map(([label, value, Icon]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{label}</p><Icon className="text-blue-600" size={21} /></div><p className="mt-3 break-words text-3xl font-bold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">Saved queue data</p></article>)}
          </section>

          <section className="rounded-2xl bg-blue-700 p-6 text-white sm:p-7"><p className="text-sm text-blue-100">Queue view</p><h3 className="mt-1 text-2xl font-bold">{providerLabel}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Changes are saved to PostgreSQL. The dashboard refreshes automatically every five seconds and queue actions are validated by the backend.</p></section>

          <section id="queue" className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Currently serving</p>{!queueActionScopeReady ? <div className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">{allProvidersView ? "Choose a specific doctor/service above" : "Choose a single time slot in the filter"} to view the active token and apply queue actions. “All slots” is a read-only combined view.</div> : current ? <><h3 className="mt-2 break-words text-3xl font-bold text-slate-900">{current.tokenNumber}</h3><div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="font-bold text-slate-900">{current.appointment?.patient?.name || "Patient"}</p><p className="mt-1 text-sm text-slate-500">{current.appointment?.doctor?.user?.name || "Doctor/service"}</p><p className="text-sm text-slate-500">{current.appointment?.doctor?.department?.name || "Service"}</p><p className="mt-2 text-xs text-slate-500">Called at: {current.servedAt ? new Date(current.servedAt).toLocaleTimeString() : "Not recorded"}</p></div><button disabled={Boolean(busyId)} onClick={() => act(current, "complete")} className="mt-5 w-full rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50">{busyId === current.id ? "Saving…" : "Mark as completed"}</button></> : <div className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No patient is currently being served for this queue view.</div>}</div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Next waiting token</p>{!queueActionScopeReady ? <div className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">{allProvidersView ? "Choose a specific doctor/service above" : "Choose a single time slot in the filter"} to call the next token. This keeps actions within one queue.</div> : next ? <><div className="mt-5 text-center"><p className="break-words text-4xl font-bold text-blue-700">{next.tokenNumber}</p><p className="mt-2 font-semibold text-slate-900">{next.appointment?.patient?.name || "Patient"}</p><p className="mt-1 text-sm text-slate-500">{next.appointment?.doctor?.user?.name || "Doctor/service"} · {next.appointment?.doctor?.department?.name || "Service"}</p><p className="mt-2 text-xs text-slate-500">Requested time: {next.appointment?.appointmentTime || "Not set"}</p></div><button disabled={Boolean(busyId) || Boolean(current)} onClick={() => act(next, "next")} className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">{busyId === next.id ? "Calling…" : current ? "Complete current patient first" : "Call next patient"}</button>{hospital?.queueActions?.allowSkip && <button disabled={Boolean(busyId)} onClick={() => act(next, "skip")} className="mt-3 w-full rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Skip patient</button>}</> : <div className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No waiting patients for this queue view.</div>}
              {!hospital?.queueActions?.allowSkip && <p className="mt-3 text-xs leading-5 text-slate-500">Skip/defer is disabled by default until Janta Hospital approves that workflow.</p>}
            </div>
          </section>

          <section id="appointments" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div><h3 className="text-lg font-bold text-slate-900">Queue and appointment records</h3><p className="mt-1 text-sm text-slate-500">Patient names are visible only to authorized staff for the assigned queue.</p></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Token</th><th className="p-3">Patient</th><th className="p-3">Doctor/service</th><th className="p-3">Requested date/time</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Created</th></tr></thead><tbody>{[...filteredQueue].sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt)).map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="p-3 font-semibold text-blue-700">{item.tokenNumber}</td><td className="p-3">{item.appointment?.patient?.name || "—"}</td><td className="p-3">{item.appointment?.doctor?.user?.name || "—"}<span className="block text-xs text-slate-500">{item.appointment?.doctor?.department?.name || "Service"}</span></td><td className="p-3">{item.appointment?.appointmentDate ? new Date(item.appointment.appointmentDate).toLocaleDateString() : "—"}<span className="block text-xs text-slate-500">{item.appointment?.appointmentTime || "Not set"}</span></td><td className="p-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.appointment?.bookingType === "EMERGENCY" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{item.appointment?.bookingType || "NORMAL"}</span>{item.appointment?.bookingType === "EMERGENCY" && <span className="block text-xs text-slate-500">Review: {item.appointment?.emergencyStatus}</span>}</td><td className="p-3"><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.status}</span></td><td className="p-3 text-slate-500">{new Date(item.joinedAt).toLocaleTimeString()}</td></tr>)}{!filteredQueue.length && !loading && <tr><td className="p-4 text-slate-500" colSpan={7}>No queue tokens found for this view.</td></tr>}</tbody></table></div></section>
        </div>
      </main>
    </div>
  );
}

export default DoctorDashboard;

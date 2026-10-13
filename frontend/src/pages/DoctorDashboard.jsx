
import { useCallback, useEffect, useState } from "react";
import {
  Bell, CalendarDays, Clock3, HeartPulse,
  Home, LogOut, Menu, Users
} from "lucide-react";

const API = "http://localhost:5000";

function DoctorDashboard() {
  const [queue, setQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [queueRes, appointmentsRes] = await Promise.all([
        fetch(`${API}/api/queue`),
        fetch(`${API}/api/appointments`)
      ]);
      if (!queueRes.ok || !appointmentsRes.ok) {
        throw new Error("Could not load hospital data");
      }
      const [queueData, appointmentData] = await Promise.all([
        queueRes.json(),
        appointmentsRes.json()
      ]);
      setQueue(queueData);
      setAppointments(appointmentData);
      setError("");
    } catch {
      setError("Backend se connect nahi ho pa raha. Check karo ki server.js running hai.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  const waiting = queue.filter(q => q.status === "WAITING");
  const serving = queue.find(q => q.status === "SERVING");
  const completed = queue.filter(q => q.status === "COMPLETED");
  const today = new Date().toDateString();
  const todaysAppointments = appointments.filter(
    a => new Date(a.appointmentDate).toDateString() === today
  );

  async function act(item, action) {
    if (!item || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `${API}/api/queue/${item.id}/action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action })
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Action failed");
      await refresh();
    } catch (e) {
      setError(e.message || "Queue action failed");
    } finally {
      setBusy(false);
    }
  }

  const current = serving || null;
  const next = waiting[0] || null;
  const currentPatient = current?.appointment?.patient;
  const currentDoctor = current?.appointment?.doctor;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 border-r border-slate-200 bg-white md:block">
        <div className="flex items-center gap-3 border-b border-slate-200 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <HeartPulse size={22} />
          </div>
          <div>
            <h1 className="font-bold text-slate-900">SmartHospital</h1>
            <p className="text-xs text-slate-500">Doctor Portal</p>
          </div>
        </div>
        <div className="p-4">
          <div className="flex w-full items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
            <Home size={18} /> Dashboard
          </div>
          <div className="mt-2 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-600">
            <Users size={18} /> Queue
          </div>
          <div className="mt-2 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-600">
            <CalendarDays size={18} /> Appointments
          </div>
          <div className="mt-2 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-600">
            <Clock3 size={18} /> Schedule
          </div>
        </div>
        <div className="px-4 py-3 text-sm text-slate-500">
          <LogOut size={18} className="mr-2 inline" /> Demo Portal
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <Menu className="md:hidden" size={22} />
            <div>
              <p className="text-sm text-slate-500">Hospital operations</p>
              <h2 className="text-xl font-bold text-slate-900">Doctor Dashboard</h2>
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
            DR
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 p-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {loading && (
            <p className="text-sm text-slate-500">Loading live hospital data…</p>
          )}

          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Waiting Patients", waiting.length, Users],
              ["Currently Serving", current ? current.tokenNumber : "—", Clock3],
              ["Today's Appointments", todaysAppointments.length, CalendarDays],
              ["Completed Visits", completed.length, HeartPulse]
            ].map(([label, value, Icon]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">{label}</p>
                  <Icon className="text-blue-600" size={21} />
                </div>
                <p className="mt-3 break-words text-3xl font-bold text-slate-900">
                  {value}
                </p>
                <p className="mt-1 text-sm text-slate-500">Live database data</p>
              </div>
            ))}
          </section>

          <section className="rounded-2xl bg-blue-600 p-7 text-white">
            <p className="text-blue-100">Department overview</p>
            <h3 className="mt-1 text-3xl font-bold">Doctor Queue Management</h3>
            <p className="mt-2 text-blue-100">
              Manage appointments and patient tokens from the live queue.
            </p>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-7">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Currently Serving
              </p>
              {current ? (
                <>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">
                    Token {current.tokenNumber}
                  </h3>
                  <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                    <p className="font-bold text-slate-900">
                      {currentPatient?.name || "Patient"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {currentDoctor?.department?.name || "Hospital consultation"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Doctor: {currentDoctor?.user?.name || "Assigned doctor"}
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      disabled={busy}
                      onClick={() => act(current, "complete")}
                      className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Complete Consultation
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-5 rounded-xl bg-slate-50 p-5 text-slate-600">
                  No patient is currently being served.
                </div>
              )}
              <div className="mt-4">
                <button
                  onClick={refresh}
                  disabled={busy}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Refresh Queue
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Next in Queue
              </p>
              {next ? (
                <>
                  <div className="mt-5 text-center">
                    <p className="break-words text-4xl font-bold text-blue-600">
                      {next.tokenNumber}
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {next.appointment?.patient?.name || "Patient"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {waiting.length} patient(s) waiting
                    </p>
                  </div>
                  <button
                    onClick={() => act(next, "next")}
                    disabled={busy}
                    className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {busy ? "Updating…" : "Call Next Patient"}
                  </button>
                  <button
                    onClick={() => act(next, "skip")}
                    disabled={busy}
                    className="mt-3 w-full rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Skip Patient
                  </button>
                </>
              ) : (
                <div className="mt-5 rounded-xl bg-slate-50 p-5 text-slate-600">
                  Queue is empty. No waiting patients.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-bold text-slate-900">Appointment Records</h3>
            <p className="mt-1 text-sm text-slate-500">
              Appointments retrieved from PostgreSQL.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-3">Token</th>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Doctor</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(a => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="p-3 font-semibold text-blue-700">
                        {a.queue?.tokenNumber || "—"}
                      </td>
                      <td className="p-3">{a.patient?.name || "—"}</td>
                      <td className="p-3">{a.doctor?.user?.name || "—"}</td>
                      <td className="p-3">
                        {new Date(a.appointmentDate).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                          {a.queue?.status || a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!appointments.length && !loading && (
                    <tr><td className="p-3 text-slate-500" colSpan={5}>No appointments found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default DoctorDashboard;

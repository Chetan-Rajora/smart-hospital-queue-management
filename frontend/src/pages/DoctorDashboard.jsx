import { useState } from "react";
import {
  Bell,
  CalendarDays,
  Clock3,
  HeartPulse,
  Home,
  LogOut,
  Menu,
  Users,
} from "lucide-react";

function DoctorDashboard() {
  const [currentToken, setCurrentToken] = useState(18);
  const [completedPatients, setCompletedPatients] = useState(12);
  const [waitingPatients, setWaitingPatients] = useState(6);

  const handleNextPatient = () => {
    if (waitingPatients <= 0) return;

    setCurrentToken((token) => token + 1);
    setWaitingPatients((count) => Math.max(count - 1, 0));
  };

  const handleCompleteConsultation = () => {
    setCompletedPatients((count) => count + 1);
  };

  const handleSkipPatient = () => {
    if (waitingPatients <= 0) return;

    setCurrentToken((token) => token + 1);
    setWaitingPatients((count) => Math.max(count - 1, 0));
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
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
          <button className="flex w-full items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
            <Home size={18} />
            Dashboard
          </button>

          <button className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-600 hover:bg-slate-50">
            <Users size={18} />
            Queue
          </button>

          <button className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-600 hover:bg-slate-50">
            <CalendarDays size={18} />
            Appointments
          </button>

          <button className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-600 hover:bg-slate-50">
            <Clock3 size={18} />
            Schedule
          </button>
        </div>

        <div className="absolute bottom-5 px-4">
          <button className="flex items-center gap-3 px-4 py-3 text-sm text-slate-500">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <button className="md:hidden">
              <Menu size={22} />
            </button>

            <div>
              <p className="text-sm text-slate-500">
                Good morning, Doctor
              </p>

              <h2 className="text-xl font-bold text-slate-900">
                Doctor Dashboard
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100">
              <Bell size={20} />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
              AS
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 p-6">
          {/* Stats */}
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Waiting Patients</p>
                <Users className="text-blue-600" size={21} />
              </div>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                {String(waitingPatients).padStart(2, "0")}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Patients in queue
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Current Token</p>
                <Clock3 className="text-orange-500" size={21} />
              </div>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                A-{currentToken}
              </p>

              <p className="mt-1 text-sm text-green-600">
                Currently serving
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Today's Patients</p>
                <CalendarDays className="text-purple-600" size={21} />
              </div>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                24
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Appointments today
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Completed</p>
                <HeartPulse className="text-green-600" size={21} />
              </div>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                {completedPatients}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Consultations done
              </p>
            </div>
          </section>

          {/* Doctor Info */}
          <section className="rounded-2xl bg-blue-600 p-7 text-white">
            <p className="text-blue-100">Cardiology Department</p>

            <h3 className="mt-1 text-3xl font-bold">
              Dr. Anil Sharma
            </h3>

            <p className="mt-2 text-blue-100">
              Manage today's appointments and patient queue.
            </p>
          </section>

          {/* Queue Management */}
          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                    Currently Serving
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-slate-900">
                    Patient Token A-{currentToken}
                  </h3>
                </div>

                <span className="rounded-full bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700">
                  In Consultation
                </span>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                    RK
                  </div>

                  <div>
                    <p className="font-bold text-slate-900">
                      Rahul Kumar
                    </p>

                    <p className="text-sm text-slate-500">
                      General Consultation
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={handleCompleteConsultation}
                  className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
                >
                  Complete Consultation
                </button>

                <button
                  onClick={handleSkipPatient}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Skip Patient
                </button>
              </div>
            </div>

            {/* Next Patient */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Next in Queue
              </p>

              <div className="mt-5 text-center">
                <p className="text-5xl font-bold text-blue-600">
                  A-{currentToken + 1}
                </p>

                <p className="mt-2 font-semibold text-slate-900">
                  Next Patient
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {Math.max(waitingPatients - 1, 0)} patients remaining
                  after this
                </p>
              </div>

              <button
                onClick={handleNextPatient}
                disabled={waitingPatients === 0}
                className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {waitingPatients === 0
                  ? "Queue Empty"
                  : "Call Next Patient"}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default DoctorDashboard;

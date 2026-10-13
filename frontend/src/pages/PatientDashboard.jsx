import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  HeartPulse,
  Home,
  LogOut,
  Menu,
  UserRound,
} from "lucide-react";

function PatientDashboard() {
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
            <p className="text-xs text-slate-500">Patient Portal</p>
          </div>
        </div>

        <div className="p-4">
          <button className="flex w-full items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
            <Home size={18} />
            Dashboard
          </button>

          <button className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-600 hover:bg-slate-50">
            <CalendarDays size={18} />
            Appointments
          </button>

          <Link
                to="/patient/queue"
                className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-600 hover:bg-slate-50"
                >
                <Clock3 size={18} />
                Queue Status
            </Link>

          <button className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-600 hover:bg-slate-50">
            <UserRound size={18} />
            Profile
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
              <Menu />
            </button>

            <div>
              <p className="text-sm text-slate-500">Welcome back</p>
              <h2 className="text-xl font-bold text-slate-900">
                Patient Dashboard
              </h2>
            </div>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
            CR
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 p-6">
          {/* Welcome */}
          <section className="rounded-2xl bg-blue-600 p-7 text-white">
            <p className="text-blue-100">Good morning!</p>

            <h3 className="mt-1 text-3xl font-bold">
              Manage your healthcare easily.
            </h3>

            <p className="mt-2 max-w-xl text-blue-100">
              Book an appointment and track your hospital queue from one
              place.
            </p>

            <Link
                to="/patient/book-appointment"
                className="mt-6 inline-block rounded-xl bg-white px-5 py-3 font-semibold text-blue-600"
                >
                Book Appointment
            </Link>
          </section>

          {/* Stats */}
          <section className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-sm text-slate-500">Active Token</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">A-24</p>
              <p className="mt-1 text-sm text-slate-500">Cardiology</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-sm text-slate-500">People Ahead</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">6</p>
              <p className="mt-1 text-sm text-green-600">Queue moving</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-sm text-slate-500">Estimated Wait</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">18 min</p>
              <p className="mt-1 text-sm text-slate-500">Updated just now</p>
            </div>
          </section>

          {/* Queue */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Live Queue Status
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Cardiology • Dr. Sharma
                </p>
              </div>

              <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                ● Live
              </span>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[65%] rounded-full bg-blue-600" />
            </div>

            <div className="mt-4 flex justify-between text-sm text-slate-500">
              <span>Currently serving: A-18</span>
              <span>Your token: A-24</span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default PatientDashboard;

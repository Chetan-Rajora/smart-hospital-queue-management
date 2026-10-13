import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  HeartPulse,
  ShieldCheck,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Clock3,
    title: "Smart Queue Tracking",
    description:
      "Track your token and estimated waiting time in real time.",
  },
  {
    icon: CalendarDays,
    title: "Easy Appointments",
    description:
      "Book appointments with doctors without waiting at the counter.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Reliable",
    description:
      "Role-based access keeps patient, doctor and admin information protected.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <HeartPulse size={23} />
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900">
                SmartHospital
              </h1>
              <p className="text-xs text-slate-500">Queue Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/patient"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Patient Portal
            </Link>

            <button className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Smart Healthcare • Smart Queue
            </div>

            <h2 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-slate-900">
              Healthcare without the
              <span className="text-blue-600"> waiting hassle.</span>
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Book appointments, generate digital tokens and track your
              position in the hospital queue — all from one platform.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/patient"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                Open Patient Portal
                <ArrowRight size={18} />
              </Link>

              <button className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-50">
                Explore Features
              </button>
            </div>
          </div>

          {/* Queue Card */}
          <div className="relative">
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Current Queue
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-slate-900">
                    Cardiology
                  </h3>
                </div>

                <div className="rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                  Live
                </div>
              </div>

              <div className="mt-7 rounded-2xl bg-slate-50 p-6 text-center">
                <p className="text-sm text-slate-500">Your Token</p>
                <p className="mt-2 text-6xl font-bold text-blue-600">A-24</p>
                <p className="mt-2 text-sm text-slate-500">
                  Estimated wait: <strong>18 minutes</strong>
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Currently Serving</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">A-18</p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">People Ahead</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">6</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Key Features
              </p>
              <h3 className="mt-2 text-3xl font-bold text-slate-900">
                A smarter way to manage hospital queues
              </h3>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                      <Icon size={24} />
                    </div>

                    <h4 className="mt-5 text-lg font-bold text-slate-900">
                      {feature.title}
                    </h4>

                    <p className="mt-2 leading-6 text-slate-600">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-slate-900 py-12 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 text-center sm:grid-cols-3">
            <div>
              <Users className="mx-auto mb-3" />
              <p className="text-3xl font-bold">24/7</p>
              <p className="mt-1 text-slate-400">Digital Access</p>
            </div>

            <div>
              <Clock3 className="mx-auto mb-3" />
              <p className="text-3xl font-bold">Real-Time</p>
              <p className="mt-1 text-slate-400">Queue Updates</p>
            </div>

            <div>
              <HeartPulse className="mx-auto mb-3" />
              <p className="text-3xl font-bold">3 Roles</p>
              <p className="mt-1 text-slate-400">Patient • Doctor • Admin</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;
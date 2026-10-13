import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock3,
  HeartPulse,
  Users,
} from "lucide-react";

function QueueStatus() {
  const [currentToken, setCurrentToken] = useState(18);

  // Simulate queue movement for the demo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentToken((token) => {
        if (token >= 23) return 18;
        return token + 1;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const yourToken = 24;
  const peopleAhead = Math.max(yourToken - currentToken - 1, 0);
  const progress = Math.min((currentToken / yourToken) * 100, 100);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link
              to="/patient"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <ArrowLeft size={20} />
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                <HeartPulse size={22} />
              </div>

              <div>
                <h1 className="font-bold text-slate-900">
                  SmartHospital
                </h1>
                <p className="text-xs text-slate-500">Live Queue</p>
              </div>
            </div>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Bell size={19} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Page heading */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Real-Time Queue
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Your Queue Status
          </h2>

          <p className="mt-2 text-slate-500">
            Track your position without waiting in the hospital lobby.
          </p>
        </div>

        {/* Main grid */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Token card */}
          <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Department</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  Cardiology
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Dr. Anil Sharma
                </p>
              </div>

              <span className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Live
              </span>
            </div>

            <div className="mt-8 rounded-3xl bg-blue-600 p-8 text-center text-white">
              <p className="text-sm font-medium text-blue-100">
                YOUR TOKEN
              </p>

              <p className="mt-2 text-7xl font-bold tracking-tight">
                A-{yourToken}
              </p>

              <p className="mt-3 text-blue-100">
                Please wait for your token to be called.
              </p>
            </div>

            {/* Queue progress */}
            <div className="mt-8">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-700">
                  Queue Progress
                </span>

                <span className="text-slate-500">
                  A-{currentToken} / A-{yourToken}
                </span>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Users size={24} />
                </div>

                <div>
                  <p className="text-sm text-slate-500">People Ahead</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {peopleAhead}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <Clock3 size={24} />
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    Estimated Waiting Time
                  </p>
                  <p className="text-3xl font-bold text-slate-900">
                    {peopleAhead * 3} min
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 text-green-600" size={22} />

                <div>
                  <p className="font-bold text-green-800">
                    You're in the queue
                  </p>

                  <p className="mt-1 text-sm leading-6 text-green-700">
                    You can wait comfortably. We'll notify you when your turn
                    is approaching.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Queue timeline */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-7">
          <h3 className="text-lg font-bold text-slate-900">
            Queue Timeline
          </h3>

          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-xs font-semibold text-green-600">COMPLETED</p>
              <p className="mt-2 text-xl font-bold text-slate-900">A-17</p>
            </div>

            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-semibold text-blue-600">
                SERVING NOW
              </p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                A-{currentToken}
              </p>
            </div>

            <div className="rounded-xl bg-orange-50 p-4">
              <p className="text-xs font-semibold text-orange-600">
                YOUR TURN
              </p>
              <p className="mt-2 text-xl font-bold text-slate-900">A-24</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">
                AFTER YOU
              </p>
              <p className="mt-2 text-xl font-bold text-slate-900">A-25+</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default QueueStatus;
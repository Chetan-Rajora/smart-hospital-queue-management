import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Clock3, HeartPulse, ShieldCheck, Users } from "lucide-react";

const features = [
  { icon: CalendarDays, title: "Request a token", description: "Choose a doctor or service, a date, and one of the configured booking slots." },
  { icon: Clock3, title: "Check your queue", description: "View the status of your own token after signing in. Waiting-time estimates stay hidden until service-time data is configured." },
  { icon: ShieldCheck, title: "Private by account", description: "Patient accounts see their own appointments and queue records. Staff controls require an authorized staff account." },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white"><HeartPulse size={24} /></span>
            <span><span className="block font-bold">Janta Hospital</span><span className="block text-xs text-slate-500">Jahangirabad</span></span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/staff-login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:px-4">Staff Login</Link>
            <Link to="/login" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:px-4">Patient portal</Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-14">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800">
              <span className="h-2 w-2 rounded-full bg-blue-600" /> Hospital queue and token requests
            </div>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">A clearer way to manage your <span className="text-blue-600">hospital visit.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">Request a token for a Janta Hospital doctor or service, then check your personal queue status from your phone or computer.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Request a token <ArrowRight size={18} /></Link>
              <a href="#services" className="rounded-xl border border-slate-300 bg-white px-5 py-3.5 font-semibold text-slate-700 hover:bg-slate-50">How it works</a>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">Slot labels are demo defaults and must be confirmed with hospital staff before operational use.</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><HeartPulse size={29} /></div>
              <div><p className="text-sm font-medium text-slate-500">Hospital</p><h2 className="text-2xl font-bold">Janta Hospital</h2><p className="text-sm text-slate-500">Jahangirabad</p></div>
            </div>
            <div className="mt-7 rounded-2xl bg-slate-50 p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Your visit, at a glance</p>
              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"><Users size={19} /></span><div><p className="font-semibold">Select a doctor or service</p><p className="mt-1 text-sm leading-5 text-slate-500">Child Specialist, Ultrasound, or General Physician.</p></div></div>
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"><CalendarDays size={19} /></span><div><p className="font-semibold">Request a token</p><p className="mt-1 text-sm leading-5 text-slate-500">Only the details required for your request are collected.</p></div></div>
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"><Clock3 size={19} /></span><div><p className="font-semibold">Follow the queue</p><p className="mt-1 text-sm leading-5 text-slate-500">The dashboard reflects queue changes saved by authorized staff.</p></div></div>
              </div>
            </div>
            <Link to="/login" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 py-3 font-semibold text-blue-700 hover:bg-blue-50">Open patient portal <ArrowRight size={17} /></Link>
          </div>
        </section>

        <section id="services" className="border-t border-slate-200 bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Simple and practical</p><h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Built around your visit</h2><p className="mt-3 leading-7 text-slate-600">The queue and staff workflow are designed to show the latest saved status, without displaying other patients' personal information.</p></div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Icon size={23} /></span><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>)}
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-slate-900 px-4 py-6 text-center text-sm text-slate-300">Janta Hospital · Jahangirabad · Queue Management</footer>
    </div>
  );
}

export default LandingPage;

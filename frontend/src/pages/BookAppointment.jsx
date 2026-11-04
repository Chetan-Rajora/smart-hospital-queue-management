import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, LoaderCircle, Stethoscope, AlertTriangle } from "lucide-react";
import { apiRequest, clearSession } from "../lib/api";

function hospitalDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function displayDate(value) {
  if (!value) return "Not set";
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return value;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12)));
}

function BookAppointment() {
  const [providers, setProviders] = useState([]);
  const [hospital, setHospital] = useState(null);
  const [providerId, setProviderId] = useState("");
  const [date, setDate] = useState(hospitalDateString());
  const [slot, setSlot] = useState("MORNING");
  const [bookingType, setBookingType] = useState("NORMAL");
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    Promise.all([apiRequest("/api/doctors"), apiRequest("/api/hospital")])
      .then(([doctorData, hospitalData]) => {
        if (!active) return;
        setProviders(Array.isArray(doctorData) ? doctorData : []);
        setHospital(hospitalData);
        const configuredSlots = hospitalData?.booking?.slots || [];
        if (configuredSlots.length && !configuredSlots.some((item) => item.value === "MORNING")) {
          setSlot(configuredSlots[0].value);
        }
        setError("");
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load the doctor/service list.");
      })
      .finally(() => {
        if (active) setLoadingProviders(false);
      });
    return () => { active = false; };
  }, []);

  const slots = hospital?.booking?.slots || [];
  const selectedSlot = slots.find((item) => item.value === slot);
  const surcharge = Number.isFinite(hospital?.booking?.emergencySurcharge)
    ? hospital.booking.emergencySurcharge
    : 500;
  const selectedProvider = useMemo(
    () => providers.find((provider) => String(provider.id) === providerId),
    [providers, providerId]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!selectedProvider || !date || !selectedSlot || !["NORMAL", "EMERGENCY"].includes(bookingType)) {
      setError("Select a doctor/service, date, configured slot, and booking type.");
      return;
    }
    if (date < hospitalDateString()) {
      setError("Please choose today or a future date.");
      return;
    }

    setBooking(true);
    try {
      const response = await apiRequest("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          doctorId: selectedProvider.id,
          appointmentDate: date,
          slot,
          bookingType,
        }),
      });
      const appointment = response.appointment;
      setBooked({
        tokenNumber: appointment?.queue?.tokenNumber,
        queueId: appointment?.queue?.id,
        message: response.message,
        providerName: selectedProvider.user?.name || selectedProvider.specialization,
        date,
        slotLabel: selectedSlot.label,
        timeRange: selectedSlot.timeRange,
        bookingType,
        emergencyStatus: appointment?.emergencyStatus || "NOT_APPLICABLE",
        surchargeAmount: appointment?.surchargeAmount || 0,
        normalFee: response.booking?.normalFee ?? hospital?.booking?.normalFee ?? null,
        totalAmount: response.booking?.totalAmount ?? null,
      });
    } catch (requestError) {
      if (requestError.status === 401) {
        clearSession();
        navigate("/login", { replace: true });
        return;
      }
      setError(requestError.message || "Could not create token request.");
    } finally {
      setBooking(false);
    }
  }

  if (booked) {
    const isEmergency = booked.bookingType === "EMERGENCY";
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 sm:px-6">
        <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl sm:p-8">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${isEmergency ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"}`}>
            {isEmergency ? <AlertTriangle size={32} /> : <CheckCircle2 size={34} />}
          </div>
          <p className={`mt-5 text-sm font-semibold uppercase tracking-wider ${isEmergency ? "text-amber-800" : "text-green-700"}`}>
            {isEmergency ? "Emergency request submitted" : "Token request saved"}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{isEmergency ? "Your request is pending staff review" : "Your token request is recorded"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{booked.message || "Your request has been saved."}</p>
          <div className="mt-6 rounded-2xl bg-blue-700 p-6 text-white">
            <p className="text-sm font-medium text-blue-100">YOUR TOKEN</p>
            <p className="mt-2 break-words text-4xl font-bold sm:text-5xl">{booked.tokenNumber || "Pending"}</p>
            <p className="mt-3 text-sm text-blue-100">{isEmergency ? "Review status: PENDING" : "Queue status: WAITING"}</p>
          </div>
          <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-5 text-left text-sm">
            <p><span className="text-slate-500">Doctor/service: </span><strong>{booked.providerName}</strong></p>
            <p><span className="text-slate-500">Date: </span><strong>{displayDate(booked.date)}</strong></p>
            <p><span className="text-slate-500">Slot: </span><strong>{booked.slotLabel} ({booked.timeRange})</strong></p>
            <p><span className="text-slate-500">Booking type: </span><strong>{isEmergency ? "Emergency" : "Normal"}</strong></p>
            {isEmergency && <p><span className="text-slate-500">Emergency surcharge: </span><strong>₹{booked.surchargeAmount} (not recorded as paid)</strong></p>}
            <p><span className="text-slate-500">Normal fee: </span><strong>{booked.normalFee == null ? "Not configured" : `₹${booked.normalFee}`}</strong></p>
            {isEmergency && <p><span className="text-slate-500">Total payable: </span><strong>{booked.totalAmount == null ? "Not configured — normal fee is unknown" : `₹${booked.totalAmount} (payment not integrated)`}</strong></p>}
            {isEmergency && <p className="text-amber-800">Review status: {booked.emergencyStatus}</p>}
          </div>
          {isEmergency && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs leading-5 text-amber-900">A serious or life-threatening emergency needs immediate in-person care. Do not wait for app approval.</p>}
          <p className="mt-4 text-left text-xs leading-5 text-slate-500">This is a token request; it does not confirm a clinical appointment time or payment. Confirm any local instructions with hospital staff.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to={`/patient/queue${booked.queueId ? `?tokenId=${booked.queueId}` : ""}`} className="flex-1 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">View queue status</Link>
            <Link to="/patient" className="flex-1 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Dashboard</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4 sm:px-6 sm:py-5">
          <Link to="/patient" aria-label="Back to dashboard" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ArrowLeft size={20} /></Link>
          <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Janta Hospital · Jahangirabad</p><h1 className="text-xl font-bold text-slate-900">Request an appointment token</h1></div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold text-slate-900">Visit request details</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">This demo requests only the information needed to create a token. No phone number is collected.</p>
            {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="provider" className="mb-2 block text-sm font-semibold text-slate-700">Doctor or service</label>
                <select id="provider" required disabled={loadingProviders || providers.length === 0} value={providerId} onChange={(event) => setProviderId(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100">
                  <option value="">{loadingProviders ? "Loading available profiles…" : providers.length ? "Select a doctor or service" : "No profiles configured"}</option>
                  {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.user?.name || provider.specialization} — {provider.department?.name || "Service"}</option>)}
                </select>
                {loadingProviders && <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><LoaderCircle className="animate-spin" size={14} /> Loading hospital directory…</p>}
                {!loadingProviders && !providers.length && !error && <p className="mt-2 text-sm text-amber-700">No active doctor/service profiles were returned. Ask the administrator to configure the directory.</p>}
              </div>

              {selectedProvider && <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="font-semibold text-slate-900">{selectedProvider.user?.name || "Provider"}</p>
                <p className="mt-1 text-sm text-slate-600">{selectedProvider.specialization}</p>
                <p className="mt-1 text-sm text-slate-600">Qualifications: {selectedProvider.qualifications || "Not configured"}</p>
                {selectedProvider.serviceMode === "DIAGNOSTIC" && <p className="mt-3 rounded-lg bg-white p-3 text-xs leading-5 text-amber-800">Ultrasound workflow: Not configured. Confirm the required process with hospital staff.</p>}
              </div>}

              <div>
                <label htmlFor="date" className="mb-2 block text-sm font-semibold text-slate-700">Booking date</label>
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1"><CalendarDays size={19} className="absolute left-4 top-3.5 text-slate-400" /><input id="date" type="date" required min={hospitalDateString()} value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-xl border border-slate-300 px-11 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>
                  <button type="button" onClick={() => setDate(hospitalDateString())} className={`rounded-xl border px-4 py-3 text-sm font-semibold ${date === hospitalDateString() ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>Today</button>
                </div>
              </div>

              <div>
                <label htmlFor="slot" className="mb-2 block text-sm font-semibold text-slate-700">Time slot</label>
                <div className="relative"><Clock3 size={19} className="absolute left-4 top-3.5 text-slate-400" /><select id="slot" required value={slot} onChange={(event) => setSlot(event.target.value)} disabled={!slots.length} className="w-full rounded-xl border border-slate-300 bg-white px-11 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100">
                  {slots.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select></div>
                {!slots.length && <p className="mt-2 text-sm text-amber-700">No time slots are configured. Please contact hospital staff.</p>}
              </div>

              <fieldset>
                <legend className="mb-2 block text-sm font-semibold text-slate-700">Booking type</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={`cursor-pointer rounded-xl border p-4 ${bookingType === "NORMAL" ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
                    <input className="mr-2 accent-blue-600" type="radio" name="bookingType" value="NORMAL" checked={bookingType === "NORMAL"} onChange={() => setBookingType("NORMAL")} />
                    <span className="font-semibold text-slate-900">Normal</span>
                    <p className="mt-2 text-sm text-slate-600">Normal queue. Fee: {hospital?.booking?.normalFee == null ? "Not configured" : `₹${hospital.booking.normalFee}`}</p>
                  </label>
                  <label className={`cursor-pointer rounded-xl border p-4 ${bookingType === "EMERGENCY" ? "border-amber-500 bg-amber-50" : "border-slate-200"}`}>
                    <input className="mr-2 accent-amber-600" type="radio" name="bookingType" value="EMERGENCY" checked={bookingType === "EMERGENCY"} onChange={() => setBookingType("EMERGENCY")} />
                    <span className="font-semibold text-slate-900">Emergency</span>
                    <p className="mt-2 text-sm text-slate-700">Additional surcharge: ₹{surcharge}</p>
                    <p className="mt-1 text-xs text-slate-600">Requires doctor/staff review; not a payment confirmation.</p>
                  </label>
                </div>
                {bookingType === "EMERGENCY" && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900">An emergency request stays pending until an authorized staff member reviews it. Serious or life-threatening symptoms need immediate in-person emergency care—do not wait for app approval. Normal consultation fee and total are not configured.</div>}
              </fieldset>
            </div>

            <button type="submit" disabled={booking || loadingProviders || !providers.length || !slots.length} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
              {booking && <LoaderCircle className="animate-spin" size={18} />}{booking ? "Saving request…" : bookingType === "EMERGENCY" ? "Submit emergency request" : "Create normal token"}
            </button>
          </form>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Stethoscope size={24} /></div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">Configured hospital slots</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">The hospital can adjust these labels and enabled slots through backend environment settings. A slot is a request, not a confirmed exact consultation time.</p>
            <ol className="mt-4 space-y-3 text-sm text-slate-600">{slots.map((item) => <li key={item.value} className="rounded-xl bg-slate-50 p-3"><strong className="block text-slate-800">{item.label}</strong>{item.timeRange}</li>)}</ol>
            <p className="mt-4 text-xs leading-5 text-slate-500">No capacity, doctor timings beyond these demo slots, normal fee, or payment gateway has been assumed.</p>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default BookAppointment;

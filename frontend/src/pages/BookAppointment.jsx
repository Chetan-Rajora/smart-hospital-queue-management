import { useState } from "react";
import { useEffect} from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Stethoscope,
} from "lucide-react";
import { Link } from "react-router-dom";

const departments = [
  "Cardiology",
  "General Medicine",
  "Dermatology",
  "Orthopedics",
  "Pediatrics",
];

const doctors = [
  {
    name: "Dr. Anil Sharma",
    specialization: "Cardiologist",
    department: "Cardiology",
  },
  {
    name: "Dr. Priya Verma",
    specialization: "General Physician",
    department: "General Medicine",
  },
  {
    name: "Dr. Rahul Mehta",
    specialization: "Orthopedic Specialist",
    department: "Orthopedics",
  },
];

function BookAppointment() {
  const [department, setDepartment] = useState("");
  const [doctor, setDoctor] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [booked, setBooked] = useState(false);
  const [apiDoctors, setApiDoctors] = useState([]);
const [bookingError, setBookingError] = useState("");
const [bookingToken, setBookingToken] = useState("");

useEffect(() => {
  const loadDoctors = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/doctors"
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      setApiDoctors(Array.isArray(data) ? data : data.doctors ?? []);
      setBookingError("");
    } catch (error) {
      console.error("Doctors loading failed:", error);
      setBookingError(
        "Doctors load nahi hue. Backend check karo."
      );
    }
  };

  loadDoctors();
}, []);

  async function handleSubmit(event) {
  event.preventDefault();
  setBookingError("");
  setBookingToken("");

  if (!department || !doctor || !date || !time) {
    setBookingError("Please fill all appointment details.");
    return;
  }

  const selectedDoctor = apiDoctors.find(
    (item) =>
      item.user.name === doctor ||
      item.user.name === `Dr. ${doctor}`
  );

  if (!selectedDoctor) {
    setBookingError("Selected doctor API mein nahi mila.");
    return;
  }

  try {
    const response = await fetch(
      "http://localhost:5000/api/appointments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          appointmentDate: date,
          appointmentTime: time,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Booking failed");
    }

    setBookingToken(result.appointment.queue.tokenNumber);
    setBooked(true);
  } catch (error) {
    setBookingError(error.message || "Booking failed");
  }
}

  if (booked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 size={34} />
          </div>

          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            Appointment Confirmed
          </h1>

          <p className="mt-2 text-slate-500">
            Your appointment has been successfully booked.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-left">
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Department</span>
              <strong>{department}</strong>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-slate-500">Doctor</span>
              <strong>{doctor}</strong>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-slate-500">Date</span>
              <strong>{date}</strong>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-slate-500">Time</span>
              <strong>{time}</strong>
            </div>
          </div>

          <Link
            to="/patient"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-5">
          <Link
            to="/patient"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <ArrowLeft size={20} />
          </Link>

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Book Appointment
            </h1>
            <p className="text-sm text-slate-500">
              Choose a doctor and convenient time
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
          >
            <h2 className="text-lg font-bold text-slate-900">
              Appointment Details
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Department
                </label>

                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select department</option>
                  {departments.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Doctor
                </label>

                <select
                  value={doctor}
                  onChange={(e) => setDoctor(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select doctor</option>

                  {doctors
                    .filter(
                      (item) =>
                        !department || item.department === department
                    )
                    .map((item) => (
                      <option key={item.name}>{item.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Appointment Date
                </label>

                <div className="relative">
                  <CalendarDays
                    size={19}
                    className="absolute left-4 top-3.5 text-slate-400"
                  />

                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-11 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Preferred Time
                </label>

                <div className="relative">
                  <Clock3
                    size={19}
                    className="absolute left-4 top-3.5 text-slate-400"
                  />

                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-11 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
            {bookingError && (
  <p className="text-red-600 text-sm">{bookingError}</p>
)}

{bookingToken && (
  <p className="text-green-700 font-semibold">
    Your queue token: {bookingToken}
  </p>
)}

            <button
              type="submit"
              className="mt-7 w-full rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700"
            >
              Confirm Appointment
            </button>
          </form>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Stethoscope size={24} />
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-900">
              How it works
            </h3>

            <div className="mt-5 space-y-5">
              <div>
                <p className="font-semibold text-slate-800">1. Select Doctor</p>
                <p className="mt-1 text-sm text-slate-500">
                  Choose the department and available doctor.
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-800">
                  2. Choose Time
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Select your preferred appointment slot.
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-800">3. Get Token</p>
                <p className="mt-1 text-sm text-slate-500">
                  Receive a digital queue token after booking.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default BookAppointment;